import { describe, expect, it } from 'vitest';
import { loadIdeas, saveIdeas } from './ideaStorage';
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
