import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { photoMaxSide, validBackupSlug } from './photo-settings';

export async function optimizePhoto(input: Uint8Array, quality: number) {
  const photo = sharp(input, { limitInputPixels: 50_000_000 });
  const metadata = await photo.metadata();
  if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
    throw new Error('Choose a JPEG, PNG, or WebP photo.');
  }
  if ((metadata.pages ?? 1) > 1) throw new Error('Choose a still photo, not an animation.');

  const { data, info } = await photo
    .autoOrient()
    .resize({ width: photoMaxSide, height: photoMaxSide, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return { data, info, original: metadata.autoOrient };
}

export async function savePhotoBackup(slug: string, jpeg: Uint8Array, directory = join(process.cwd(), 'src/assets/recipe-img')) {
  if (!validBackupSlug(slug)) throw new Error('Use a valid recipe slug.');
  await writeFile(join(directory, `${slug}.jpg`), jpeg, { flag: 'wx' });
  return `src/assets/recipe-img/${slug}.jpg`;
}
