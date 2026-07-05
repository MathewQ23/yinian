import { describe, expect, it } from 'vitest';
import { getImage, saveImage } from './imageStore';

describe('image store', () => {
  it('stores uploaded images in IndexedDB and returns a retrievable id', async () => {
    const image = new File(['fake image bytes'], 'screenshot.png', { type: 'image/png' });

    const id = await saveImage(image);
    const stored = await getImage(id);

    expect(id).toMatch(/^image_/);
    expect(stored?.name).toBe('screenshot.png');
    expect(stored?.type).toBe('image/png');
    expect(await stored?.text()).toBe('fake image bytes');
  });
});
