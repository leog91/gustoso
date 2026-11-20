import type { APIRoute } from 'astro';
import { maxPhotoBytes, validBackupSlug } from '../../../lib/photo-settings';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });

export const POST: APIRoute = async ({ request, url }) => {
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });
  if (request.headers.get('origin') !== url.origin) return error('Same-origin requests only.', 403);
  const slug = url.searchParams.get('slug') ?? '';
  if (!validBackupSlug(slug)) return error('Enter a valid recipe slug.', 400);
  const privateKey = import.meta.env.IMAGEKIT_PRIVATE_KEY?.trim();
  if (!privateKey) return error('Add IMAGEKIT_PRIVATE_KEY to .env and restart the dev server.', 503);

  const { findPhotoBackup } = await import('../../../lib/photo-backup-path');
  const backup = findPhotoBackup(slug);
  if (!backup) return error('No backup found for this recipe slug. Save a project backup first.', 404);
  const { lstat, readFile } = await import('node:fs/promises');
  let jpeg: Blob;
  try {
    const info = await lstat(backup);
    if (!info.isFile() || info.size === 0 || info.size > maxPhotoBytes) {
      return error('Choose a saved JPEG no larger than 20 MB.', 422);
    }
    const bytes = await readFile(backup);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return error('The project backup is not a JPEG.', 422);
    }
    jpeg = new Blob([bytes], { type: 'image/jpeg' });
  } catch {
    return error('Could not read the project backup.', 500);
  }
  const { uploadRecipePhoto } = await import('../../../lib/imagekit');
  try {
    const link = await uploadRecipePhoto(jpeg, slug, privateKey);
    return Response.json({ url: link }, { status: 201, headers });
  } catch (cause) {
    const message = cause instanceof Error && cause.message.startsWith('ImageKit ')
      ? cause.message : 'Could not reach ImageKit. Check the Media Library before retrying.';
    return error(message, 502);
  }
};
