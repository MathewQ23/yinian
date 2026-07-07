import { describe, expect, it } from 'vitest';
import type { Idea, IdeaDraft } from './types';
import { createIdea, formatIdeaTime, groupIdeasByDay } from './ideas';

describe('idea domain', () => {
  it('creates a url-sourced idea with automatic timestamps and stable id prefix', () => {
    const now = new Date('2026-07-05T22:36:00+08:00');
    const draft: IdeaDraft = {
      content: '机械臂控制页面应该以 3D 模型为核心。',
      source: { type: 'url', content: 'https://waveshare.com/roarm-m3' },
    };

    const idea = createIdea(draft, now);

    expect(idea.id).toMatch(/^idea_/);
    expect(idea.content).toBe(draft.content);
    expect(idea.source).toEqual(draft.source);
    expect(idea.createdAt).toBe('2026-07-05T14:36:00.000Z');
    expect(idea.updatedAt).toBe('2026-07-05T14:36:00.000Z');
  });

  it('keeps linked idea ids when creating a new idea', () => {
    const now = new Date('2026-07-05T22:40:00+08:00');
    const idea = createIdea({
      content: '新想法可以接到旧想法后面。',
      source: null,
      linkedIdeaIds: ['idea_old_1', 'idea_old_2'],
    }, now);

    expect(idea.linkedIdeaIds).toEqual(['idea_old_1', 'idea_old_2']);
  });

  it('groups ideas into 今天、昨天 and calendar dates using local day boundaries', () => {
    const now = new Date('2026-07-05T10:00:00+08:00');
    const ideas: Idea[] = [
      ideaAt('today', '2026-07-05T09:01:00+08:00'),
      ideaAt('yesterday', '2026-07-04T23:20:00+08:00'),
      ideaAt('older', '2026-07-03T21:00:00+08:00'),
    ];

    const groups = groupIdeasByDay(ideas, now);

    expect(groups.map((group) => group.label)).toEqual(['今天', '昨天', '2026年7月3日']);
    expect(groups[0].ideas.map((idea) => idea.content)).toEqual(['today']);
  });

  it('formats timeline time as HH:mm in local time', () => {
    expect(formatIdeaTime('2026-07-05T14:36:00.000Z')).toBe('22:36');
  });
});

function ideaAt(content: string, createdAt: string): Idea {
  return {
    id: `idea_${content}`,
    content,
    source: { type: 'text', content: 'source' },
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(createdAt).toISOString(),
  };
}
