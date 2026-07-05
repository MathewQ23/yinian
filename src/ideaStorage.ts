import type { Idea } from './types';

const STORAGE_KEY = 'yinian.ideas.v1';

export function loadIdeas(): Idea[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Idea[];
    if (!Array.isArray(parsed)) return [];
    return sortIdeas(parsed);
  } catch {
    return [];
  }
}

export function saveIdeas(ideas: Idea[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortIdeas(ideas)));
}

export function addIdea(idea: Idea): Idea[] {
  const ideas = sortIdeas([idea, ...loadIdeas()]);
  saveIdeas(ideas);
  return ideas;
}

function sortIdeas(ideas: Idea[]): Idea[] {
  return [...ideas].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
