import type { Idea, IdeaSource } from './types';

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

export async function fetchServerIdeas(): Promise<Idea[]> {
  const response = await fetch('/api/ideas');
  if (!response.ok) throw new Error(`Failed to fetch ideas: ${response.status}`);
  const body = (await response.json()) as IdeasResponse;
  return body.ideas;
}

export async function createServerIdea(input: { content: string; source: IdeaSource | null }): Promise<Idea> {
  const response = await fetch('/api/ideas', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Failed to create idea: ${response.status}`);
  const body = (await response.json()) as IdeaResponse;
  return body.idea;
}

export async function deleteServerIdea(ideaId: string): Promise<void> {
  const response = await fetch(`/api/ideas/${encodeURIComponent(ideaId)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete idea: ${response.status}`);
}

export async function uploadImageToServer(file: File): Promise<UploadResponse> {
  const response = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      type: file.type,
      data: await fileToBase64(file),
    }),
  });
  if (!response.ok) throw new Error(`Failed to upload image: ${response.status}`);
  return (await response.json()) as UploadResponse;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
