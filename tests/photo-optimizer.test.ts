import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { optimizePhoto, savePhotoBackup } from '../src/lib/photo-optimizer';
import { defaultPhotoQuality } from '../src/lib/photo-settings';

test('resizes a Gustoso photo and outputs a smaller JPEG', async () => {
  const source = await Bun.file('src/assets/recipe-img/pistachio-profiterole.jpg').bytes();
  const { data, info, original } = await optimizePhoto(source, defaultPhotoQuality);
  expect(original).toEqual({ width: 1700, height: 1280 });
  expect(info).toMatchObject({ format: 'jpeg', width: 1200, height: 904 });
  expect(data.length).toBeLessThan(source.length);
});

test('auto-orients photos, caps the longest side and strips EXIF', async () => {
  const source = await sharp({ create: { width: 1600, height: 800, channels: 3, background: 'red' } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const { data, original, info } = await optimizePhoto(source, 80);
  expect(original).toEqual({ width: 800, height: 1600 });
  expect(info).toMatchObject({ width: 600, height: 1200 });
  expect((await sharp(data).metadata()).exif).toBeUndefined();
});

test('does not enlarge small images and flattens transparency on white', async () => {
  const source = await sharp({ create: { width: 40, height: 20, channels: 4, background: '#00000000' } })
    .png().toBuffer();
  const { data, info } = await optimizePhoto(source, 80);
  expect(info).toMatchObject({ width: 40, height: 20, channels: 3 });
  const pixels = await sharp(data).raw().toBuffer();
  expect(pixels.every((value) => value === 255)).toBe(true);
});

test('rejects data that is not an image', async () => {
  await expect(optimizePhoto(new Uint8Array([1, 2, 3]), 80)).rejects.toThrow();
});

test('saves a backup without overwriting or allowing path traversal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gustoso-photo-'));
  try {
    const jpeg = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'white' } }).jpeg().toBuffer();
    expect(await savePhotoBackup('tiramisu-truffles', jpeg, directory))
      .toBe('src/assets/recipe-img/tiramisu-truffles.jpg');
    await expect(savePhotoBackup('tiramisu-truffles', new Uint8Array([1]), directory)).rejects.toMatchObject({ code: 'EEXIST' });
    await expect(savePhotoBackup('../outside', jpeg, directory)).rejects.toThrow('valid recipe slug');
    expect(await readFile(join(directory, 'tiramisu-truffles.jpg'))).toEqual(jpeg);
  } finally {
    await rm(directory, { recursive: true });
  }
});
