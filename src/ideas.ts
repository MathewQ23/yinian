import type { Idea, IdeaDayGroup, IdeaDraft, IdeaExtensionNode, IdeaLifecycle, IdeaLifecycleStatus, IdeaLifecycleUpdate } from './types';

const APP_TIME_ZONE = 'Asia/Shanghai';

const TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: APP_TIME_ZONE,
});

export function createIdea(draft: IdeaDraft, now = new Date()): Idea {
  if (!draft.content.trim()) {
    throw new Error('idea content is required');
  }

  const timestamp = now.toISOString();
  const linkedIdeaIds = normalizeLinkedIdeaIds(draft.linkedIdeaIds);
  const lifecycle = normalizeLifecycle(undefined);

  if (!draft.source) {
    return {
      id: `idea_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
      content: draft.content.trim(),
      source: null,
      ...(linkedIdeaIds.length ? { linkedIdeaIds } : {}),
      lifecycle,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  return {
    id: `idea_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    content: draft.content.trim(),
    source: normalizeSource(draft.source),
    ...(linkedIdeaIds.length ? { linkedIdeaIds } : {}),
    lifecycle,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function groupIdeasByDay(ideas: Idea[], now = new Date()): IdeaDayGroup[] {
  const sorted = [...ideas].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = new Map<string, Idea[]>();

  for (const idea of sorted) {
    const key = localDateKey(new Date(idea.createdAt));
    const bucket = groups.get(key) ?? [];
    bucket.push(idea);
    groups.set(key, bucket);
  }

  const today = localDateKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);

  return [...groups.entries()].map(([key, groupIdeas]) => ({
    label: key === today ? '今天' : key === yesterday ? '昨天' : formatCalendarLabel(key),
    ideas: groupIdeas,
  }));
}

export function formatIdeaTime(isoTime: string): string {
  return TIME_FORMATTER.format(new Date(isoTime));
}

export function updateIdeaLifecycle(idea: Idea, update: IdeaLifecycleUpdate): Idea {
  const now = update.now ?? new Date();
  const currentLifecycle = normalizeLifecycle(idea.lifecycle);
  const nextStatus = update.status ?? currentLifecycle.status;
  const practiceText = update.practiceText?.trim();
  const practiceLog = practiceText && !currentLifecycle.practiceLog.some((entry) => entry.text === practiceText)
    ? [...currentLifecycle.practiceLog, { text: practiceText, createdAt: now.toISOString() }]
    : currentLifecycle.practiceLog;

  return {
    ...idea,
    lifecycle: {
      status: nextStatus,
      practiceLog,
    },
    updatedAt: now.toISOString(),
  };
}

export function buildIdeaChainLinks(ideas: Idea[], targetIdea: Idea): Idea[] {
  const ideasById = new Map(ideas.map((idea) => [idea.id, idea]));
  const collected = new Map<string, Idea>();

  function collectAncestors(idea: Idea, seen = new Set<string>()) {
    if (seen.has(idea.id)) return;
    seen.add(idea.id);
    for (const linkedId of idea.linkedIdeaIds ?? []) {
      const linkedIdea = ideasById.get(linkedId);
      if (!linkedIdea) continue;
      collectAncestors(linkedIdea, seen);
      collected.set(linkedIdea.id, linkedIdea);
    }
  }

  collectAncestors(targetIdea);
  return [...collected.values(), targetIdea];
}

export function buildIdeaExtensionTree(ideas: Idea[], rootIdea: Idea): IdeaExtensionNode {
  const childrenByParentId = new Map<string, Idea[]>();
  for (const idea of ideas) {
    for (const parentId of idea.linkedIdeaIds ?? []) {
      const children = childrenByParentId.get(parentId) ?? [];
      children.push(idea);
      childrenByParentId.set(parentId, children);
    }
  }

  function buildNode(idea: Idea, seen = new Set<string>()): IdeaExtensionNode {
    if (seen.has(idea.id)) return { idea, children: [] };
    const nextSeen = new Set(seen);
    nextSeen.add(idea.id);
    const children = (childrenByParentId.get(idea.id) ?? [])
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((child) => buildNode(child, nextSeen));
    return { idea, children };
  }

  return buildNode(rootIdea);
}

export function countIdeaExtensionDescendants(node: IdeaExtensionNode): number {
  return node.children.reduce((total, child) => total + 1 + countIdeaExtensionDescendants(child), 0);
}

export function lifecycleLabel(status: IdeaLifecycleStatus): string {
  return status === 'seed' ? '萌芽' : status === 'practicing' ? '实践中' : status === 'validated' ? '已验证' : '暂停';
}

export function urlHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function localDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: APP_TIME_ZONE,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function formatCalendarLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

function normalizeSource(source: NonNullable<IdeaDraft['source']>) {
  return {
    ...source,
    content: source.content.trim(),
  };
}

function normalizeLifecycle(lifecycle: Idea['lifecycle']): IdeaLifecycle {
  const status = isLifecycleStatus(lifecycle?.status) ? lifecycle.status : 'seed';
  const practiceLog = Array.isArray(lifecycle?.practiceLog)
    ? lifecycle.practiceLog
        .map((entry) => ({ text: String(entry.text ?? '').trim(), createdAt: String(entry.createdAt ?? '') }))
        .filter((entry) => entry.text && entry.createdAt)
    : [];
  return { status, practiceLog };
}

function isLifecycleStatus(value: unknown): value is IdeaLifecycleStatus {
  return value === 'seed' || value === 'practicing' || value === 'validated' || value === 'paused';
}

function normalizeLinkedIdeaIds(linkedIdeaIds: IdeaDraft['linkedIdeaIds']): string[] {
  if (!Array.isArray(linkedIdeaIds)) return [];
  return [...new Set(linkedIdeaIds.map((id) => id.trim()).filter(Boolean))];
}
