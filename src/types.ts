export type SourceType = 'url' | 'image' | 'text';

export type IdeaLifecycleStatus = 'seed' | 'practicing' | 'validated' | 'paused';

export interface IdeaPracticeEntry {
  text: string;
  createdAt: string;
}

export interface IdeaLifecycle {
  status: IdeaLifecycleStatus;
  practiceLog: IdeaPracticeEntry[];
}

export type IdeaLifecycleUpdate = {
  status?: IdeaLifecycleStatus;
  practiceText?: string;
  now?: Date;
};

export type IdeaSource =
  | { type: 'url'; content: string }
  | { type: 'image'; content: string; previewUrl?: string; fileName?: string }
  | { type: 'text'; content: string };

export interface Idea {
  id: string;
  content: string;
  source: IdeaSource | null;
  linkedIdeaIds?: string[];
  lifecycle?: IdeaLifecycle;
  createdAt: string;
  updatedAt: string;
}

export interface IdeaDraft {
  content: string;
  source: IdeaSource | null;
  linkedIdeaIds?: string[];
}

export interface IdeaDayGroup {
  label: string;
  ideas: Idea[];
}

export interface IdeaExtensionNode {
  idea: Idea;
  children: IdeaExtensionNode[];
}
