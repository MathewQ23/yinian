import { createServer as createHttpServer } from 'node:http';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { createReadStream, readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
};

export function createYinianServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 3010);
  const basePath = normalizeBasePath(options.basePath ?? process.env.YINIAN_BASE_PATH ?? '');
  const dataDir = path.resolve(options.dataDir ?? process.env.YINIAN_DATA_DIR ?? path.join(rootDir, 'server-data'));
  const uploadDir = path.resolve(options.uploadDir ?? process.env.YINIAN_UPLOAD_DIR ?? path.join(dataDir, 'uploads'));
  const publicDir = path.resolve(options.publicDir ?? process.env.YINIAN_PUBLIC_DIR ?? path.join(rootDir, 'dist'));
  const legacyJsonFile = path.join(dataDir, 'ideas.json');
  const sqliteFile = path.join(dataDir, 'yinian.sqlite');
  let db;

  async function ensureStorage() {
    await mkdir(dataDir, { recursive: true });
    await mkdir(uploadDir, { recursive: true });
    ensureDatabase();
  }

  async function readIdeas() {
    await ensureStorage();
    return db.prepare('SELECT id, content, source_json, created_at, updated_at FROM ideas ORDER BY created_at DESC').all().map(rowToIdea);
  }

  async function saveIdea(idea) {
    await ensureStorage();
    db.prepare(`
      INSERT INTO ideas (id, content, source_json, created_at, updated_at)
      VALUES (@id, @content, @sourceJson, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        source_json = excluded.source_json,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `).run(ideaToRow(idea));
  }

  async function deleteIdea(id) {
    await ensureStorage();
    db.prepare('DELETE FROM ideas WHERE id = ?').run(id);
  }

  async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length === 0) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  async function sendJson(res, status, value) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(value));
  }

  async function handleApi(req, res, url) {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/ideas') {
      return sendJson(res, 200, { ideas: await readIdeas() });
    }

    if (req.method === 'POST' && url.pathname === '/api/ideas') {
      const body = await readJsonBody(req);
      if (!body.content || !String(body.content).trim()) {
        return sendJson(res, 400, { error: 'content is required' });
      }
      const now = new Date().toISOString();
      const idea = {
        id: body.id || `idea_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        content: String(body.content).trim(),
        source: body.source ?? null,
        linkedIdeaIds: normalizeLinkedIdeaIds(body.linkedIdeaIds),
        createdAt: body.createdAt || now,
        updatedAt: body.updatedAt || now,
      };
      await saveIdea(idea);
      return sendJson(res, 201, { idea });
    }

    const deleteMatch = url.pathname.match(/^\/api\/ideas\/([^/]+)$/);
    if (req.method === 'DELETE' && deleteMatch) {
      const id = decodeURIComponent(deleteMatch[1]);
      await deleteIdea(id);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/uploads') {
      const body = await readJsonBody(req);
      if (!body.data || !body.fileName || !body.type) {
        return sendJson(res, 400, { error: 'fileName, type and data are required' });
      }
      await ensureStorage();
      const safeExt = extensionForMime(String(body.type), String(body.fileName));
      const fileName = `image_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${safeExt}`;
      const bytes = Buffer.from(String(body.data), 'base64');
      await writeFile(path.join(uploadDir, fileName), bytes);
      return sendJson(res, 201, { url: `/uploads/${fileName}`, fileName: String(body.fileName) });
    }

    return sendJson(res, 404, { error: 'not found' });
  }

  async function serveStatic(req, res, url) {
    const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const relative = pathname.replace(/^\/+/, '');
    const requestedPath = path.resolve(publicDir, relative);
    const safePublicDir = `${publicDir}${path.sep}`;
    const filePath = requestedPath.startsWith(safePublicDir) || requestedPath === publicDir ? requestedPath : path.join(publicDir, 'index.html');

    try {
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error('not file');
      res.writeHead(200, { 'content-type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
    } catch {
      const indexPath = path.join(publicDir, 'index.html');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      createReadStream(indexPath).pipe(res);
    }
  }

  const server = createHttpServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      if (basePath && (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))) {
        url.pathname = url.pathname.slice(basePath.length) || '/';
      }
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      if (url.pathname.startsWith('/uploads/')) {
        const requested = path.resolve(uploadDir, decodeURIComponent(url.pathname.replace('/uploads/', '')));
        const safeUploadDir = `${uploadDir}${path.sep}`;
        if (!requested.startsWith(safeUploadDir)) return sendJson(res, 403, { error: 'forbidden' });
        res.writeHead(200, { 'content-type': MIME_TYPES[path.extname(requested)] ?? 'application/octet-stream' });
        return createReadStream(requested).on('error', () => sendJson(res, 404, { error: 'not found' })).pipe(res);
      }
      await serveStatic(req, res, url);
    } catch (error) {
      await sendJson(res, 500, { error: error instanceof Error ? error.message : 'server error' });
    }
  });

  return { server, port, ensureStorage, readIdeas };

  function ensureDatabase() {
    if (db) return;
    db = new Database(sqliteFile);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE IF NOT EXISTS ideas (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        source_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
    `);
    migrateLegacyJsonIfNeeded();
  }

  function migrateLegacyJsonIfNeeded() {
    const count = db.prepare('SELECT COUNT(*) AS count FROM ideas').get().count;
    if (count > 0) return;
    let raw;
    try {
      raw = readFileSyncUtf8(legacyJsonFile);
    } catch {
      return;
    }
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    const insert = db.prepare(`
      INSERT OR IGNORE INTO ideas (id, content, source_json, created_at, updated_at)
      VALUES (@id, @content, @sourceJson, @createdAt, @updatedAt)
    `);
    const migrate = db.transaction((ideas) => {
      for (const idea of ideas) {
        if (!idea?.id || !idea?.content) continue;
        insert.run(ideaToRow({
          id: String(idea.id),
          content: String(idea.content),
          source: idea.source ?? null,
          linkedIdeaIds: normalizeLinkedIdeaIds(idea.linkedIdeaIds),
          createdAt: idea.createdAt || new Date().toISOString(),
          updatedAt: idea.updatedAt || idea.createdAt || new Date().toISOString(),
        }));
      }
    });
    migrate(parsed);
  }
}

function readFileSyncUtf8(filePath) {
  return readFileSync(filePath, 'utf8');
}

function ideaToRow(idea) {
  const linkedIdeaIds = normalizeLinkedIdeaIds(idea.linkedIdeaIds);
  const sourceJson = linkedIdeaIds.length
    ? JSON.stringify({ source: idea.source ?? null, linkedIdeaIds })
    : idea.source == null ? null : JSON.stringify(idea.source);

  return {
    id: idea.id,
    content: idea.content,
    sourceJson,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
  };
}

function rowToIdea(row) {
  const parsed = row.source_json ? JSON.parse(row.source_json) : null;
  const isEnvelope = parsed && typeof parsed === 'object' && ('source' in parsed || 'linkedIdeaIds' in parsed);
  const linkedIdeaIds = normalizeLinkedIdeaIds(isEnvelope ? parsed.linkedIdeaIds : undefined);

  return {
    id: row.id,
    content: row.content,
    source: isEnvelope ? parsed.source : parsed,
    ...(linkedIdeaIds.length ? { linkedIdeaIds } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeLinkedIdeaIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id).trim()).filter(Boolean))];
}

function normalizeBasePath(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '/') return '';
  return `/${raw.replace(/^\/+|\/+$/g, '')}`;
}

function extensionForMime(mimeType, originalName) {
  const originalExt = path.extname(originalName).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(originalExt)) return originalExt;
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  return '.bin';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createYinianServer();
  await app.ensureStorage();
  app.server.listen(app.port, '127.0.0.1', () => {
    console.log(`Yinian server listening on http://127.0.0.1:${app.port}`);
  });
}
