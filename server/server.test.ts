/// <reference types="node" />

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
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
