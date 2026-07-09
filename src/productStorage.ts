import { defaultEntries, defaultExploreItems, defaultThreads, type Entry, type ExploreItem, type WorkThread } from './productData';

export const PRODUCT_THREADS_KEY = 'yinian.product.threads';
export const PRODUCT_ENTRIES_KEY = 'yinian.product.entries';
export const PRODUCT_EXPLORE_ITEMS_KEY = 'yinian.product.exploreItems';

function loadArrayFromStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

export function loadProductThreads(): WorkThread[] {
  return loadArrayFromStorage(PRODUCT_THREADS_KEY, defaultThreads);
}

export function saveProductThreads(threads: WorkThread[]) {
  window.localStorage.setItem(PRODUCT_THREADS_KEY, JSON.stringify(threads));
}

export function loadProductEntries(): Entry[] {
  return loadArrayFromStorage(PRODUCT_ENTRIES_KEY, defaultEntries);
}

export function saveProductEntries(entries: Entry[]) {
  window.localStorage.setItem(PRODUCT_ENTRIES_KEY, JSON.stringify(entries));
}

export function loadProductExploreItems(): ExploreItem[] {
  return loadArrayFromStorage(PRODUCT_EXPLORE_ITEMS_KEY, defaultExploreItems);
}

export function saveProductExploreItems(items: ExploreItem[]) {
  window.localStorage.setItem(PRODUCT_EXPLORE_ITEMS_KEY, JSON.stringify(items));
}
