import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

beforeEach(() => {
  localStorage.clear();
  indexedDB.deleteDatabase('yinian-images');
});
