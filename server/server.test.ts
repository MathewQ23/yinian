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
  it('serves built assets under the configured subpath', async () => {
    await new Promise<void>((resolve) => app.server.close(() => resolve()));
    const publicDir = path.join(tempDir, 'subpath-public');
    await mkdir(path.join(publicDir, 'assets'), { recursive: true });
    await writeFile(path.join(publicDir, 'index.html'), '<script type="module" src="/yinian/assets/app.js"></script>');
    await writeFile(path.join(publicDir, 'assets', 'app.js'), 'window.__YINIAN_LOADED__ = true;');
    app = createYinianServer({ dataDir: path.join(tempDir, 'data'), uploadDir: path.join(tempDir, 'uploads'), publicDir, port: 0 });
    await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('server did not restart');
    baseUrl = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${baseUrl}/yinian/assets/app.js`);
    expect(response.headers.get('content-type')).toContain('text/javascript');
    expect(await response.text()).toBe('window.__YINIAN_LOADED__ = true;');
  });

  it('seeds product data once and returns a complete bootstrap after restart', async () => {
    const first = await fetch(`${baseUrl}/api/product/bootstrap`).then((response) => response.json());
    expect(first.threads.length).toBeGreaterThan(0);
    expect(first.entries.length).toBeGreaterThan(0);
    expect(first.exploreItems.length).toBeGreaterThan(0);
    expect(first.threads[0]).toHaveProperty('stages');
    expect(first.entries[0]).toHaveProperty('tags');
    expect(first.exploreItems[0]).toHaveProperty('linkedThreadIds');

    await new Promise<void>((resolve) => app.server.close(() => resolve()));
    app = createYinianServer({ dataDir: path.join(tempDir, 'data'), uploadDir: path.join(tempDir, 'uploads'), publicDir: path.join(tempDir, 'public'), port: 0 });
    await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('server did not restart');
    baseUrl = `http://127.0.0.1:${address.port}`;
    const second = await fetch(`${baseUrl}/api/product/bootstrap`).then((response) => response.json());
    expect(second).toEqual(first);
  });

  it('roundtrips product CRUD, notes, status and thread links', async () => {
    const thread = { id: 't-new', name: '新工作线', description: '完整字段', status: '进行中', stage: '起步', blocker: '', nextStep: '测试', updatedAt: '现在', recordCount: 0, issueCount: 0, sourceCount: 0, icon: '新', stages: [{ label: '起步', state: 'current' }] };
    expect((await jsonRequest('/api/product/threads', 'POST', thread)).thread).toEqual(thread);
    expect((await jsonRequest('/api/product/threads/t-new', 'PATCH', { blocker: '等待资源' })).thread).toEqual({ ...thread, blocker: '等待资源' });
    const entry = { id: 'entry-new', time: '12:00', date: '今天', threadId: 't-new', type: '记录', title: '标题', body: '正文', tags: ['完整'], source: '测试', relatedIds: ['e15'] };
    expect((await jsonRequest('/api/product/entries', 'POST', entry)).entry).toEqual(entry);
    const afterCreate = await fetch(`${baseUrl}/api/product/bootstrap`).then((response) => response.json());
    expect(afterCreate.entries[0].id).toBe('entry-new');
    expect((await jsonRequest('/api/product/entries/entry-new', 'PATCH', { title: '新标题' })).entry.title).toBe('新标题');
    const batchThread = { ...thread, id: 't-batch', name: '批量整理' };
    const batchResult = await jsonRequest('/api/product/entries/batch-move', 'POST', { entryIds: ['entry-new'], thread: batchThread });
    expect(batchResult.thread).toEqual(batchThread);
    expect(batchResult.entries[0].threadId).toBe('t-batch');
    expect((await jsonRequest('/api/product/explore-items/browser-harness/status', 'PATCH', { status: '已采用' })).exploreItem.status).toBe('已采用');
    const note = { id: 'note-new', time: '12:01', content: '探索记录' };
    expect((await jsonRequest('/api/product/explore-items/browser-harness/notes', 'POST', note)).exploreItem.explorationNotes).toContainEqual(note);
    expect((await jsonRequest('/api/product/explore-items/browser-harness/thread-link', 'PUT', { threadId: 't-new', linked: true })).exploreItem.linkedThreadIds).toContain('t-new');
    expect((await fetch(`${baseUrl}/api/product/threads/t-new`, { method: 'DELETE' })).status).toBe(200);
    const afterThreadDelete = await fetch(`${baseUrl}/api/product/bootstrap`).then((response) => response.json());
    expect(afterThreadDelete.threads.some((item: { id: string }) => item.id === 't-new')).toBe(false);
    expect(afterThreadDelete.entries.some((item: { threadId: string }) => item.threadId === 't-new')).toBe(false);
    expect(afterThreadDelete.exploreItems.find((item: { id: string }) => item.id === 'browser-harness').linkedThreadIds).not.toContain('t-new');
    expect((await fetch(`${baseUrl}/api/product/entries/entry-new`, { method: 'DELETE' })).status).toBe(200);
    const bootstrap = await fetch(`${baseUrl}/api/product/bootstrap`).then((response) => response.json());
    expect(bootstrap.entries.some((item: { id: string }) => item.id === 'entry-new')).toBe(false);
  });

  it('transactionally imports only present valid localStorage arrays and is idempotent', async () => {
    const importedThread = { id: 'imported', name: '导入线', description: '', status: '暂停', stage: '', blocker: '', nextStep: '', updatedAt: '旧', recordCount: 1, issueCount: 0, sourceCount: 0, icon: '导', stages: [] };
    const importedEntry = { id: 'imported-entry', time: '08:00', date: '昨天', threadId: 'imported', type: '记录', title: '导入记录', body: '', tags: [] };
    const importedExplore = { id: 'imported-explore', title: '导入探索', sourceType: '网页', domain: 'example.com', reason: '', status: '待探索', savedAt: '昨天', tags: [], linkedThreadIds: ['imported'] };
    const oldIdea = { id: 'old-idea', content: '旧想法', source: null, linkedIdeaIds: [], lifecycle: { status: 'seed', practiceLog: [] }, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    const payload = { 'yinian.product.threads': [importedThread], 'yinian.product.entries': [importedEntry], 'yinian.product.exploreItems': [importedExplore], 'yinian.ideas.v1': [oldIdea] };
    const first = await jsonRequest('/api/migrations/local-storage', 'POST', payload);
    expect(first.safeToDeleteKeys).toEqual(Object.keys(payload));
    await jsonRequest('/api/migrations/local-storage', 'POST', payload);
    const bootstrap = await fetch(`${baseUrl}/api/product/bootstrap`).then((response) => response.json());
    expect(bootstrap).toEqual({ threads: [importedThread], entries: [importedEntry], exploreItems: [importedExplore] });
    const ideas = await fetch(`${baseUrl}/api/ideas`).then((response) => response.json());
    expect(ideas.ideas.filter((idea: { id: string }) => idea.id === 'old-idea')).toHaveLength(1);
    expect((await jsonRequest('/api/migrations/local-storage', 'POST', { unrelated: [] })).safeToDeleteKeys).toEqual([]);
    expect(await fetch(`${baseUrl}/api/product/bootstrap`).then((response) => response.json())).toEqual(bootstrap);
  });

  it('rejects malformed migration collections without changing sqlite', async () => {
    const before = await fetch(`${baseUrl}/api/product/bootstrap`).then((response) => response.json());
    const response = await fetch(`${baseUrl}/api/migrations/local-storage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ 'yinian.product.threads': { nope: true } }) });
    expect(response.status).toBe(400);
    expect(await fetch(`${baseUrl}/api/product/bootstrap`).then((item) => item.json())).toEqual(before);
  });

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

  it('persists lifecycle metadata on server-created ideas', async () => {
    const createResponse = await fetch(`${baseUrl}/api/ideas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: '把引用链推进到实践',
        source: null,
        lifecycle: { status: 'practicing', practiceLog: [{ text: '先做一个小实验', createdAt: '2026-07-06T00:30:00.000Z' }] },
      }),
    });

    expect(createResponse.status).toBe(201);
    const { idea } = await createResponse.json();
    expect(idea.lifecycle).toEqual({ status: 'practicing', practiceLog: [{ text: '先做一个小实验', createdAt: '2026-07-06T00:30:00.000Z' }] });

    const listBody = await fetch(`${baseUrl}/api/ideas`).then((response) => response.json());
    expect(listBody.ideas[0].lifecycle).toEqual(idea.lifecycle);
  });

  it('updates idea lifecycle over the API without replacing content or references', async () => {
    const createResponse = await fetch(`${baseUrl}/api/ideas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '服务器实践链条', source: null, linkedIdeaIds: ['root'] }),
    });
    const { idea } = await createResponse.json();

    const updateResponse = await fetch(`${baseUrl}/api/ideas/${idea.id}/lifecycle`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lifecycle: { status: 'validated', practiceLog: [{ text: '上线后验证有效', createdAt: '2026-07-06T02:00:00.000Z' }] } }),
    });

    expect(updateResponse.status).toBe(200);
    const { idea: updatedIdea } = await updateResponse.json();
    expect(updatedIdea).toMatchObject({
      id: idea.id,
      content: '服务器实践链条',
      linkedIdeaIds: ['root'],
      lifecycle: { status: 'validated', practiceLog: [{ text: '上线后验证有效', createdAt: '2026-07-06T02:00:00.000Z' }] },
    });

    const listBody = await fetch(`${baseUrl}/api/ideas`).then((response) => response.json());
    expect(listBody.ideas[0].lifecycle.status).toBe('validated');
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

async function jsonRequest(pathname: string, method: string, body: unknown) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  expect(response.status, await response.clone().text()).toBeLessThan(300);
  return response.json();
}
