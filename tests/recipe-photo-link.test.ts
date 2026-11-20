import { expect, test } from 'bun:test';
import { editRecipeImage, isImageKitUrl } from '../src/lib/recipe-photo-link';

const url = 'https://ik.imagekit.io/gustoso/panna-cotta.jpg';

test('adds the photo without changing review status, line endings or notes', () => {
  const original = '---\r\ntitle: Panna Cotta\r\nneedsReview: true\r\n---\r\nKeep the notes.\r\n';
  expect(editRecipeImage(original, '', url)).toBe(original.replace('title:', `img: "${url}"\r\ntitle:`));
});

test('replaces only the existing scalar and preserves its comment', () => {
  const original = '---\ntitle: Test\nimg: https://i.imgur.com/old.jpg # photo\npublished: false\n---\n';
  expect(editRecipeImage(original, 'https://i.imgur.com/old.jpg', url))
    .toBe(original.replace('https://i.imgur.com/old.jpg', `"${url}"`));
});

test('removes a photo link but not other frontmatter or body content', () => {
  const original = `---\r\ntitle: Test\r\nimg: "${url}"\r\nneedsReview: true\r\n---\r\nimg: literal text`;
  expect(editRecipeImage(original, url, null)).toBe(original.replace(`img: "${url}"\r\n`, ''));
  const last = `---\ntitle: Test\nimg: "${url}"\n---\n`;
  expect(editRecipeImage(last, url, null)).toBe('---\ntitle: Test\n---\n');
});

test('rejects stale edits and untrusted URL hosts', () => {
  expect(() => editRecipeImage(`---\ntitle: Test\nimg: "${url}"\n---\n`, '', null)).toThrow('changed elsewhere');
  expect(isImageKitUrl(url)).toBe(true);
  expect(isImageKitUrl('https://ik.imagekit.io.example.com/photo.jpg')).toBe(false);
  expect(isImageKitUrl('http://ik.imagekit.io/photo.jpg')).toBe(false);
});
