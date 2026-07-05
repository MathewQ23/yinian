import type { Idea, IdeaDayGroup, IdeaDraft } from './types';

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

  if (!draft.source) {
    return {
      id: `idea_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
      content: draft.content.trim(),
      source: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  return {
    id: `idea_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    content: draft.content.trim(),
    source: normalizeSource(draft.source),
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
