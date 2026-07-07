import { describe, expect, it } from 'vitest';
import { loadIdeas, saveIdeas, updateIdea } from './ideaStorage';
import type { Idea } from './types';

describe('idea storage', () => {
  it('persists ideas in localStorage newest first', () => {
    const older = idea('older', '2026-07-05T10:00:00.000Z');
    const newer = idea('newer', '2026-07-05T11:00:00.000Z');

    saveIdeas([older, newer]);

    expect(loadIdeas().map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it('returns an empty list when localStorage has no ideas', () => {
    expect(loadIdeas()).toEqual([]);
  });

  it('updates a persisted idea while keeping sort order', () => {
    const older = idea('older', '2026-07-05T10:00:00.000Z');
    const newer = idea('newer', '2026-07-05T11:00:00.000Z');
    saveIdeas([older, newer]);

    updateIdea({ ...older, lifecycle: { status: 'practicing', practiceLog: [{ text: '先实践一次', createdAt: '2026-07-06T00:00:00.000Z' }] } });

    expect(loadIdeas().map((item) => item.id)).toEqual(['newer', 'older']);
    expect(loadIdeas().find((item) => item.id === 'older')?.lifecycle?.status).toBe('practicing');
  });
});

function idea(id: string, createdAt: string): Idea {
  return {
    id,
    content: id,
    source: { type: 'text', content: 'source' },
    createdAt,
    updatedAt: createdAt,
  };
}
