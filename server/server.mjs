import { createServer as createHttpServer } from 'node:http';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { createReadStream, readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const productSeed = JSON.parse(readFileSync(path.join(__dirname, 'product-seed.json'), 'utf8'));
const PRODUCT_KEYS = {
  'yinian.product.threads': 'threads',
  'yinian.product.entries': 'entries',
  'yinian.product.exploreItems': 'explore_items',
};
const IDEAS_KEY = 'yinian.ideas.v1';

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
  const basePath = normalizeBasePath(options.basePath ?? process.env.YINIAN_BASE_PATH ?? '/yinian');
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

  async function updateIdeaLifecycle(id, lifecycle) {
    await ensureStorage();
    const row = db.prepare('SELECT id, content, source_json, created_at, updated_at FROM ideas WHERE id = ?').get(id);
    if (!row) return null;
    const idea = rowToIdea(row);
    const updatedIdea = { ...idea, lifecycle: normalizeLifecycle(lifecycle), updatedAt: new Date().toISOString() };
    await saveIdea(updatedIdea);
    return updatedIdea;
  }

  async function readProduct() {
    await ensureStorage();
    return { threads: readEntities('threads'), entries: readEntities('entries'), exploreItems: readEntities('explore_items') };
  }

  function readEntities(table) {
    return db.prepare(`SELECT data_json FROM ${table} ORDER BY position`).all().map((row) => JSON.parse(row.data_json));
  }

  function getEntity(table, id) {
    const row = db.prepare(`SELECT data_json FROM ${table} WHERE id = ?`).get(id);
    return row ? JSON.parse(row.data_json) : null;
  }

  function nextPosition(table) {
    return db.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS value FROM ${table}`).get().value;
  }

  function saveEntity(table, entity, position) {
    db.prepare(`INSERT INTO ${table} (id, data_json, position) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, position = excluded.position`)
      .run(entity.id, JSON.stringify(entity), position ?? nextPosition(table));
  }

  function prependEntity(table, entity) {
    db.transaction(() => {
      db.prepare(`UPDATE ${table} SET position = position + 1`).run();
      saveEntity(table, entity, 0);
    })();
  }

  function replaceEntities(table, entities) {
    db.prepare(`DELETE FROM ${table}`).run();
    entities.forEach((entity, index) => saveEntity(table, entity, index));
  }

  function saveIdeaSync(idea) {
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO ideas (id, content, source_json, created_at, updated_at) VALUES (@id, @content, @sourceJson, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET content=excluded.content, source_json=excluded.source_json, created_at=excluded.created_at, updated_at=excluded.updated_at`)
      .run(ideaToRow({ ...idea, content: String(idea.content), createdAt: idea.createdAt || now, updatedAt: idea.updatedAt || idea.createdAt || now }));
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

    if (req.method === 'GET' && url.pathname === '/api/product/bootstrap') {
      return sendJson(res, 200, await readProduct());
    }

    if (req.method === 'POST' && url.pathname === '/api/product/worklines') {
      const body = await readJsonBody(req);
      if (!body.thread?.name || !body.entry?.body) return sendJson(res, 400, { error: 'thread name and entry body are required' });
      await ensureStorage();
      const thread = { ...body.thread, id: body.thread.id || crypto.randomUUID() };
      const entry = { ...body.entry, threadId: thread.id, id: body.entry.id || crypto.randomUUID() };
      const transaction = db.transaction(() => { saveEntity('threads', thread); prependEntity('entries', entry); });
      transaction();
      return sendJson(res, 201, { thread, entry });
    }

    if (req.method === 'POST' && url.pathname === '/api/product/threads') {
      const body = await readJsonBody(req);
      const thread = { ...body, id: body.id || crypto.randomUUID() };
      await ensureStorage(); saveEntity('threads', thread);
      return sendJson(res, 201, { thread });
    }
    const threadMatch = url.pathname.match(/^\/api\/product\/threads\/([^/]+)$/);
    if (req.method === 'PATCH' && threadMatch) {
      await ensureStorage();
      const current = getEntity('threads', decodeURIComponent(threadMatch[1]));
      if (!current) return sendJson(res, 404, { error: 'not found' });
      const thread = { ...current, ...await readJsonBody(req), id: current.id };
      saveEntity('threads', thread); return sendJson(res, 200, { thread });
    }
    if (req.method === 'DELETE' && threadMatch) {
      await ensureStorage();
      const id = decodeURIComponent(threadMatch[1]);
      db.transaction(() => {
        db.prepare('DELETE FROM threads WHERE id = ?').run(id);
        db.prepare("DELETE FROM entries WHERE json_extract(data_json, '$.threadId') = ?").run(id);
        for (const item of readEntities('explore_items')) {
          if (item.linkedThreadIds?.includes(id)) saveEntity('explore_items', { ...item, linkedThreadIds: item.linkedThreadIds.filter((threadId) => threadId !== id) });
        }
      })();
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/product/entries') {
      const body = await readJsonBody(req);
      const entry = { ...body, id: body.id || crypto.randomUUID() };
      if (!entry.threadId) return sendJson(res, 400, { error: 'threadId is required' });
      await ensureStorage();
      if (!getEntity('threads', entry.threadId)) return sendJson(res, 400, { error: 'unknown threadId' });
      prependEntity('entries', entry); return sendJson(res, 201, { entry });
    }
    if (req.method === 'POST' && url.pathname === '/api/product/entries/batch-move') {
      const body = await readJsonBody(req);
      if (!Array.isArray(body.entryIds) || body.entryIds.length === 0) return sendJson(res, 400, { error: 'entryIds are required' });
      await ensureStorage();
      const thread = body.thread ? { ...body.thread, id: body.thread.id || crypto.randomUUID() } : getEntity('threads', body.threadId);
      if (!thread) return sendJson(res, 400, { error: 'target thread is required' });
      const entries = [];
      try {
        db.transaction(() => {
          if (body.thread) saveEntity('threads', thread);
          for (const id of body.entryIds) {
            const current = getEntity('entries', id);
            if (!current) throw new Error(`unknown entry: ${id}`);
            const entry = { ...current, threadId: thread.id };
            saveEntity('entries', entry); entries.push(entry);
          }
        })();
      } catch (error) { return sendJson(res, 400, { error: error instanceof Error ? error.message : 'batch move failed' }); }
      return sendJson(res, 200, { thread, entries });
    }
    const entryMatch = url.pathname.match(/^\/api\/product\/entries\/([^/]+)$/);
    if (entryMatch && req.method === 'PATCH') {
      await ensureStorage();
      const current = getEntity('entries', decodeURIComponent(entryMatch[1]));
      if (!current) return sendJson(res, 404, { error: 'not found' });
      const entry = { ...current, ...await readJsonBody(req), id: current.id };
      if (!getEntity('threads', entry.threadId)) return sendJson(res, 400, { error: 'unknown threadId' });
      saveEntity('entries', entry); return sendJson(res, 200, { entry });
    }
    if (entryMatch && req.method === 'DELETE') {
      await ensureStorage(); db.prepare('DELETE FROM entries WHERE id = ?').run(decodeURIComponent(entryMatch[1]));
      return sendJson(res, 200, { ok: true });
    }

    const exploreAction = url.pathname.match(/^\/api\/product\/explore-items\/([^/]+)\/(status|notes|thread-link)$/);
    if (exploreAction && ((exploreAction[2] === 'status' && req.method === 'PATCH') || (exploreAction[2] === 'notes' && req.method === 'POST') || (exploreAction[2] === 'thread-link' && req.method === 'PUT'))) {
      await ensureStorage();
      const current = getEntity('explore_items', decodeURIComponent(exploreAction[1]));
      if (!current) return sendJson(res, 404, { error: 'not found' });
      const body = await readJsonBody(req);
      let exploreItem;
      if (exploreAction[2] === 'status') exploreItem = { ...current, status: body.status };
      if (exploreAction[2] === 'notes') exploreItem = { ...current, explorationNotes: [...(current.explorationNotes ?? []), { ...body, id: body.id || crypto.randomUUID() }] };
      if (exploreAction[2] === 'thread-link') {
        if (!body.threadId || !getEntity('threads', body.threadId)) return sendJson(res, 400, { error: 'unknown threadId' });
        const links = new Set(current.linkedThreadIds ?? []);
        if (body.linked === false) links.delete(body.threadId);
        else links.add(body.threadId);
        exploreItem = { ...current, linkedThreadIds: [...links] };
      }
      saveEntity('explore_items', exploreItem); return sendJson(res, 200, { exploreItem });
    }

    if (req.method === 'POST' && url.pathname === '/api/migrations/local-storage') {
      const body = await readJsonBody(req);
      const knownKeys = [...Object.keys(PRODUCT_KEYS), IDEAS_KEY].filter((key) => Object.hasOwn(body, key));
      if (knownKeys.some((key) => !Array.isArray(body[key]))) return sendJson(res, 400, { error: 'migration collections must be arrays' });
      if (knownKeys.some((key) => body[key].some((item) => !validEntity(item)))) return sendJson(res, 400, { error: 'migration items require ids' });
      await ensureStorage();
      try {
        db.transaction(() => {
          for (const [key, table] of Object.entries(PRODUCT_KEYS)) if (Object.hasOwn(body, key)) replaceEntities(table, body[key]);
          for (const entry of readEntities('entries')) {
            if (!entry.threadId || !getEntity('threads', entry.threadId)) throw new Error(`unknown entry threadId: ${entry.threadId ?? ''}`);
          }
          for (const item of readEntities('explore_items')) {
            for (const threadId of item.linkedThreadIds ?? []) if (!getEntity('threads', threadId)) throw new Error(`unknown explore threadId: ${threadId}`);
          }
          if (Object.hasOwn(body, IDEAS_KEY)) for (const idea of body[IDEAS_KEY]) {
            if (!idea.content) throw new Error('idea content is required');
            saveIdeaSync(idea);
          }
        })();
      } catch (error) { return sendJson(res, 400, { error: error instanceof Error ? error.message : 'invalid migration' }); }
      return sendJson(res, 200, { safeToDeleteKeys: knownKeys });
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
        lifecycle: normalizeLifecycle(body.lifecycle),
        createdAt: body.createdAt || now,
        updatedAt: body.updatedAt || now,
      };
      await saveIdea(idea);
      return sendJson(res, 201, { idea });
    }

    const lifecycleMatch = url.pathname.match(/^\/api\/ideas\/([^/]+)\/lifecycle$/);
    if (req.method === 'PATCH' && lifecycleMatch) {
      const id = decodeURIComponent(lifecycleMatch[1]);
      const body = await readJsonBody(req);
      const idea = await updateIdeaLifecycle(id, body.lifecycle);
      if (!idea) return sendJson(res, 404, { error: 'not found' });
      return sendJson(res, 200, { idea });
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
      CREATE TABLE IF NOT EXISTS threads (id TEXT PRIMARY KEY, data_json TEXT NOT NULL, position INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, data_json TEXT NOT NULL, position INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS explore_items (id TEXT PRIMARY KEY, data_json TEXT NOT NULL, position INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    migrateLegacyJsonIfNeeded();
    seedProductIfNeeded();
  }

  function seedProductIfNeeded() {
    if (db.prepare("SELECT value FROM app_metadata WHERE key = 'product_seeded'").get()) return;
    db.transaction(() => {
      replaceEntities('threads', productSeed.threads);
      replaceEntities('entries', productSeed.entries);
      replaceEntities('explore_items', productSeed.exploreItems);
      db.prepare("INSERT INTO app_metadata (key, value) VALUES ('product_seeded', '1')").run();
    })();
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
          lifecycle: normalizeLifecycle(idea.lifecycle),
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

function validEntity(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && String(value.id ?? '').trim());
}

function ideaToRow(idea) {
  const linkedIdeaIds = normalizeLinkedIdeaIds(idea.linkedIdeaIds);
  const lifecycle = normalizeLifecycle(idea.lifecycle);
  const sourceJson = JSON.stringify({ source: idea.source ?? null, linkedIdeaIds, lifecycle });

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
    lifecycle: normalizeLifecycle(isEnvelope ? parsed.lifecycle : undefined),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeLinkedIdeaIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id).trim()).filter(Boolean))];
}

function normalizeLifecycle(value) {
  const status = ['seed', 'practicing', 'validated', 'paused'].includes(value?.status) ? value.status : 'seed';
  const practiceLog = Array.isArray(value?.practiceLog)
    ? value.practiceLog
        .map((entry) => ({ text: String(entry?.text ?? '').trim(), createdAt: String(entry?.createdAt ?? '') }))
        .filter((entry) => entry.text && entry.createdAt)
    : [];
  return { status, practiceLog };
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
  const host = process.env.HOST || '127.0.0.1';
  app.server.listen(app.port, host, () => {
    console.log(`Yinian server listening on http://${host}:${app.port}`);
  });
}
