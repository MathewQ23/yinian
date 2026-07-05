import { describe, expect, it } from 'vitest';
import { buildExportFileName, buildExportPayload } from './exportIdeas';
import type { Idea } from './types';

describe('idea export', () => {
  it('builds a versioned JSON backup payload with exportedAt and ideas', () => {
    const exportedAt = new Date('2026-07-05T23:20:00+08:00');
    const ideas: Idea[] = [
      {
        id: 'idea_001',
        content: '记录想法，也记录来源。',
        source: { type: 'url', content: 'https://example.com/article' },
        createdAt: '2026-07-05T14:36:00.000Z',
        updatedAt: '2026-07-05T14:36:00.000Z',
      },
    ];

    const payload = JSON.parse(buildExportPayload(ideas, exportedAt));

    expect(payload).toEqual({
      app: 'yinian-mvp',
      version: 1,
      exportedAt: '2026-07-05T15:20:00.000Z',
      ideas,
    });
  });

  it('uses a readable date-stamped file name', () => {
    expect(buildExportFileName(new Date('2026-07-05T23:20:00+08:00'))).toBe('yinian-ideas-2026-07-05.json');
  });
});
