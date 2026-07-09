import { describe, expect, it, beforeEach } from 'vitest';
import { defaultEntries, defaultExploreItems, defaultThreads, type Entry, type ExploreItem, type WorkThread } from './productData';
import { loadProductEntries, loadProductExploreItems, loadProductThreads, saveProductEntries, saveProductExploreItems, saveProductThreads } from './productStorage';

const customThread: WorkThread = {
  id: 'custom-thread',
  name: '自定义工作线',
  description: '从本地存储恢复的工作线',
  status: '进行中',
  stage: '验证持久化',
  blocker: '暂无',
  nextStep: '刷新后继续显示',
  updatedAt: '现在',
  recordCount: 0,
  issueCount: 0,
  sourceCount: 0,
  icon: '新',
  stages: [{ label: '初始化', state: 'current' }],
};

const customEntry: Entry = {
  id: 'custom-entry',
  time: '现在',
  date: '今天',
  threadId: 'custom-thread',
  type: '记录',
  title: '自定义记录',
  body: '自定义记录',
  tags: [],
};

const customExploreItem: ExploreItem = {
  id: 'custom-explore',
  title: '自定义待探索',
  sourceType: '网页',
  domain: 'example.com',
  reason: '验证探索持久化',
  status: '探索中',
  savedAt: '现在',
  tags: ['验证'],
  linkedThreadIds: ['custom-thread'],
  explorationNotes: [{ id: 'note-1', time: '现在', content: '已经开始探索。' }],
};

describe('product local storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads default product threads, entries, and exploration items when local storage is empty', () => {
    expect(loadProductThreads()).toEqual(defaultThreads);
    expect(loadProductEntries()).toEqual(defaultEntries);
    expect(loadProductExploreItems()).toEqual(defaultExploreItems);
  });

  it('persists custom product threads, entries, and exploration items', () => {
    saveProductThreads([customThread]);
    saveProductEntries([customEntry]);
    saveProductExploreItems([customExploreItem]);

    expect(loadProductThreads()).toEqual([customThread]);
    expect(loadProductEntries()).toEqual([customEntry]);
    expect(loadProductExploreItems()).toEqual([customExploreItem]);
  });

  it('falls back to defaults when stored JSON is invalid', () => {
    window.localStorage.setItem('yinian.product.threads', '{broken');
    window.localStorage.setItem('yinian.product.entries', '{broken');
    window.localStorage.setItem('yinian.product.exploreItems', '{broken');

    expect(loadProductThreads()).toEqual(defaultThreads);
    expect(loadProductEntries()).toEqual(defaultEntries);
    expect(loadProductExploreItems()).toEqual(defaultExploreItems);
  });
});
