import { describe, expect, it } from 'vitest';
import type { Idea, IdeaDraft } from './types';
import { buildIdeaChainLinks, buildIdeaExtensionTree, createIdea, formatIdeaTime, groupIdeasByDay, updateIdeaLifecycle } from './ideas';

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

  it('creates lifecycle metadata for a fresh idea', () => {
    const idea = createIdea({ content: '把引用发展成实践链条。', source: null }, new Date('2026-07-05T22:40:00+08:00'));

    expect(idea.lifecycle).toEqual({ status: 'seed', practiceLog: [] });
  });

  it('updates an idea lifecycle with deduplicated practice entries', () => {
    const idea = ideaAt('从灵感进入实践。', '2026-07-05T09:01:00+08:00');

    const updated = updateIdeaLifecycle(idea, {
      status: 'practicing',
      practiceText: '今天先做一个最小页面',
      now: new Date('2026-07-06T08:30:00+08:00'),
    });
    const unchanged = updateIdeaLifecycle(updated, {
      status: 'practicing',
      practiceText: '今天先做一个最小页面',
      now: new Date('2026-07-06T08:45:00+08:00'),
    });

    expect(unchanged.lifecycle).toEqual({
      status: 'practicing',
      practiceLog: [{ text: '今天先做一个最小页面', createdAt: '2026-07-06T00:30:00.000Z' }],
    });
    expect(unchanged.updatedAt).toBe('2026-07-06T00:45:00.000Z');
  });

  it('builds an oldest-to-newest idea chain from references', () => {
    const root = ideaAt('看见一句话', '2026-07-05T09:01:00+08:00');
    root.id = 'root';
    const branch = ideaAt('产生一个想法', '2026-07-05T10:01:00+08:00');
    branch.id = 'branch';
    branch.linkedIdeaIds = ['root'];
    const leaf = ideaAt('实践后继续延伸', '2026-07-05T11:01:00+08:00');
    leaf.id = 'leaf';
    leaf.linkedIdeaIds = ['branch'];

    const links = buildIdeaChainLinks([leaf, root, branch], leaf);

    expect(links.map((idea) => idea.id)).toEqual(['root', 'branch', 'leaf']);
  });

  it('builds a visual extension tree from one idea to all descendants', () => {
    const root = ideaAt('源头：部署到公网', '2026-07-05T09:01:00+08:00');
    root.id = 'root';
    const feature = ideaAt('延伸：添加想法链条', '2026-07-05T10:01:00+08:00');
    feature.id = 'feature';
    feature.linkedIdeaIds = ['root'];
    const fix = ideaAt('实践：修复空白页', '2026-07-05T11:01:00+08:00');
    fix.id = 'fix';
    fix.linkedIdeaIds = ['feature'];
    const sibling = ideaAt('延伸：添加数据库', '2026-07-05T09:30:00+08:00');
    sibling.id = 'sibling';
    sibling.linkedIdeaIds = ['root'];

    const tree = buildIdeaExtensionTree([fix, sibling, feature, root], root);

    expect(tree.idea.id).toBe('root');
    expect(tree.children.map((child) => child.idea.id)).toEqual(['sibling', 'feature']);
    expect(tree.children[1].children.map((child) => child.idea.id)).toEqual(['fix']);
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
