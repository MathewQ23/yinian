export type SourceType = 'url' | 'image' | 'text';

export type IdeaSource =
  | { type: 'url'; content: string }
  | { type: 'image'; content: string; previewUrl?: string; fileName?: string }
  | { type: 'text'; content: string };

export interface Idea {
  id: string;
  content: string;
  source: IdeaSource;
  createdAt: string;
  updatedAt: string;
}

export interface IdeaDraft {
  content: string;
  source: IdeaSource | null;
}

export interface IdeaDayGroup {
  label: string;
  ideas: Idea[];
}
