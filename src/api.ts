import type { Idea, IdeaSource } from './types';
import type { Entry, ExploreItem, ExploreNote, WorkThread } from './productData';

interface IdeasResponse {
  ideas: Idea[];
}

interface IdeaResponse {
  idea: Idea;
}

interface UploadResponse {
  url: string;
  fileName: string;
}

export interface ProductBootstrap {
  threads: WorkThread[];
  entries: Entry[];
  exploreItems: ExploreItem[];
}

export type LegacyLocalStoragePayload = Partial<{
  'yinian.product.threads': WorkThread[];
  'yinian.product.entries': Entry[];
  'yinian.product.exploreItems': ExploreItem[];
  'yinian.ideas.v1': Idea[];
}>;

export interface LocalStorageMigrationResult { safeToDeleteKeys: string[] }

const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
const apiBase = `${baseUrl}/api`;

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, init);
  if (!response.ok) throw new Error(`API request failed (${path}): ${response.status}`);
  return response.json() as Promise<T>;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

export function fetchProductBootstrap(): Promise<ProductBootstrap> { return requestJson('/product/bootstrap'); }
export async function createProductWorkline(thread: Omit<WorkThread, 'id'>, entry: Omit<Entry, 'id' | 'threadId'>): Promise<{ thread: WorkThread; entry: Entry }> { return requestJson('/product/worklines', jsonInit('POST', { thread, entry })); }
export async function createProductThread(thread: Omit<WorkThread, 'id'>): Promise<WorkThread> { return (await requestJson<{ thread: WorkThread }>('/product/threads', jsonInit('POST', thread))).thread; }
export async function updateProductThread(id: string, patch: Partial<WorkThread>): Promise<WorkThread> { return (await requestJson<{ thread: WorkThread }>(`/product/threads/${encodeURIComponent(id)}`, jsonInit('PATCH', patch))).thread; }
export async function deleteProductThread(id: string): Promise<void> { await requestJson(`/product/threads/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
export async function createProductEntry(entry: Omit<Entry, 'id'>): Promise<Entry> { return (await requestJson<{ entry: Entry }>('/product/entries', jsonInit('POST', entry))).entry; }
export async function updateProductEntry(id: string, patch: Partial<Entry>): Promise<Entry> { return (await requestJson<{ entry: Entry }>(`/product/entries/${encodeURIComponent(id)}`, jsonInit('PATCH', patch))).entry; }
export async function deleteProductEntry(id: string): Promise<void> { await requestJson(`/product/entries/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
export async function batchMoveProductEntries(entryIds: string[], target: { threadId: string } | { thread: Omit<WorkThread, 'id'> }): Promise<{ thread: WorkThread; entries: Entry[] }> { return requestJson('/product/entries/batch-move', jsonInit('POST', { entryIds, ...target })); }
export async function updateExploreItemStatus(id: string, status: ExploreItem['status']): Promise<ExploreItem> { return (await requestJson<{ exploreItem: ExploreItem }>(`/product/explore-items/${encodeURIComponent(id)}/status`, jsonInit('PATCH', { status }))).exploreItem; }
export async function addExploreItemNote(id: string, note: Omit<ExploreNote, 'id'>): Promise<ExploreItem> { return (await requestJson<{ exploreItem: ExploreItem }>(`/product/explore-items/${encodeURIComponent(id)}/notes`, jsonInit('POST', note))).exploreItem; }
export async function setExploreItemThreadLink(id: string, threadId: string, linked = true): Promise<ExploreItem> { return (await requestJson<{ exploreItem: ExploreItem }>(`/product/explore-items/${encodeURIComponent(id)}/thread-link`, jsonInit('PUT', { threadId, linked }))).exploreItem; }
export function importLegacyLocalStorage(payload: LegacyLocalStoragePayload): Promise<LocalStorageMigrationResult> { return requestJson('/migrations/local-storage', jsonInit('POST', payload)); }

export async function importLegacyLocalStorageFrom(storage: Pick<Storage, 'getItem' | 'removeItem'> = window.localStorage): Promise<LocalStorageMigrationResult> {
  const keys = ['yinian.product.threads', 'yinian.product.entries', 'yinian.product.exploreItems', 'yinian.ideas.v1'] as const;
  const payload: Record<string, unknown[]> = {};
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) payload[key] = parsed;
    } catch { /* Retain malformed local data. */ }
  }
  const result = await importLegacyLocalStorage(payload as LegacyLocalStoragePayload);
  result.safeToDeleteKeys.forEach((key) => storage.removeItem(key));
  return result;
}

function assetUrl(path: string): string {
  if (!path.startsWith('/')) return path;
  return `${baseUrl}${path}`;
}

export async function fetchServerIdeas(): Promise<Idea[]> {
  const response = await fetch(`${apiBase}/ideas`);
  if (!response.ok) throw new Error(`Failed to fetch ideas: ${response.status}`);
  const body = (await response.json()) as IdeasResponse;
  return body.ideas;
}

export async function createServerIdea(input: { content: string; source: IdeaSource | null; linkedIdeaIds?: string[]; lifecycle?: Idea['lifecycle'] }): Promise<Idea> {
  const response = await fetch(`${apiBase}/ideas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Failed to create idea: ${response.status}`);
  const body = (await response.json()) as IdeaResponse;
  return body.idea;
}

export async function deleteServerIdea(ideaId: string): Promise<void> {
  const response = await fetch(`${apiBase}/ideas/${encodeURIComponent(ideaId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete idea: ${response.status}`);
}

export async function updateServerIdeaLifecycle(ideaId: string, lifecycle: Idea['lifecycle']): Promise<Idea> {
  const response = await fetch(`${apiBase}/ideas/${encodeURIComponent(ideaId)}/lifecycle`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lifecycle }),
  });
  if (!response.ok) throw new Error(`Failed to update idea lifecycle: ${response.status}`);
  const body = (await response.json()) as IdeaResponse;
  return body.idea;
}

export async function uploadImageToServer(file: File): Promise<UploadResponse> {
  const response = await fetch(`${apiBase}/uploads`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      type: file.type,
      data: await fileToBase64(file),
    }),
  });
  if (!response.ok) throw new Error(`Failed to upload image: ${response.status}`);
  const body = (await response.json()) as UploadResponse;
  return { ...body, url: assetUrl(body.url) };
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
