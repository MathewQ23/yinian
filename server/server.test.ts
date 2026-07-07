/// <reference types="node" />

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createYinianServer } from './server.mjs';

let tempDir: string;
let baseUrl: string;
let app: ReturnType<typeof createYinianServer>;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'yinian-server-'));
  const publicDir = path.join(tempDir, 'public');
  await mkdir(publicDir, { recursive: true });
  app = createYinianServer({ dataDir: path.join(tempDir, 'data'), uploadDir: path.join(tempDir, 'uploads'), publicDir, port: 0 });
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('server did not listen on a TCP port');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => app.server.close(() => resolve()));
  await rm(tempDir, { recursive: true, force: true });
});

describe('Yinian server API', () => {
  it('creates, lists and deletes plain ideas', async () => {
    const createResponse = await fetch(`${baseUrl}/api/ideas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '服务器在线保存想法', source: null }),
    });
    expect(createResponse.status).toBe(201);
    const { idea } = await createResponse.json();
    expect(idea.source).toBeNull();

    const listResponse = await fetch(`${baseUrl}/api/ideas`);
    const listBody = await listResponse.json();
    expect(listBody.ideas).toHaveLength(1);
    expect(listBody.ideas[0].content).toBe('服务器在线保存想法');

    const deleteResponse = await fetch(`${baseUrl}/api/ideas/${idea.id}`, { method: 'DELETE' });
    expect(deleteResponse.status).toBe(200);

    const afterDelete = await fetch(`${baseUrl}/api/ideas`).then((response) => response.json());
    expect(afterDelete.ideas).toEqual([]);
  });

  it('persists linked idea ids on server-created ideas', async () => {
    const createResponse = await fetch(`${baseUrl}/api/ideas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '引用链上的新想法', source: null, linkedIdeaIds: ['idea_a', 'idea_b'] }),
    });

    expect(createResponse.status).toBe(201);
    const { idea } = await createResponse.json();
    expect(idea.linkedIdeaIds).toEqual(['idea_a', 'idea_b']);

    const listBody = await fetch(`${baseUrl}/api/ideas`).then((response) => response.json());
    expect(listBody.ideas[0].linkedIdeaIds).toEqual(['idea_a', 'idea_b']);
  });

  it('migrates legacy ideas.json into sqlite storage', async () => {
    await new Promise<void>((resolve) => app.server.close(() => resolve()));
    await rm(tempDir, { recursive: true, force: true });
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'yinian-server-'));
    const dataDir = path.join(tempDir, 'data');
    const publicDir = path.join(tempDir, 'public');
    await mkdir(dataDir, { recursive: true });
    await mkdir(publicDir, { recursive: true });
    await writeFile(path.join(dataDir, 'ideas.json'), JSON.stringify([
      {
        id: 'legacy_1',
        content: '旧 JSON 想法',
        source: { type: 'url', url: 'https://example.com' },
        createdAt: '2026-01-02T03:04:05.000Z',
        updatedAt: '2026-01-02T03:04:05.000Z',
      },
    ]));

    app = createYinianServer({ dataDir, uploadDir: path.join(tempDir, 'uploads'), publicDir, port: 0 });
    await app.ensureStorage();

    const ideas = await app.readIdeas();
    expect(ideas).toHaveLength(1);
    expect(ideas[0]).toMatchObject({ id: 'legacy_1', content: '旧 JSON 想法', source: { type: 'url', url: 'https://example.com' } });
    await expect(stat(path.join(dataDir, 'yinian.sqlite'))).resolves.toBeTruthy();
    await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('server did not listen on a TCP port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  it('stores image uploads and returns an uploads URL', async () => {
    const uploadResponse = await fetch(`${baseUrl}/api/uploads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileName: 'shot.png', type: 'image/png', data: Buffer.from('fake image').toString('base64') }),
    });

    expect(uploadResponse.status).toBe(201);
    const body = await uploadResponse.json();
    expect(body.url).toMatch(/^\/uploads\/image_/);

    const imageResponse = await fetch(`${baseUrl}${body.url}`);
    expect(imageResponse.status).toBe(200);
    expect(await imageResponse.text()).toBe('fake image');
  });
});
