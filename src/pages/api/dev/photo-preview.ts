import type { APIRoute } from 'astro';
import { maxPhotoBytes, validBackupSlug } from '../../../lib/photo-settings';

export const GET: APIRoute = async ({ url }) => {
  const notFound = () => new Response(null, { status: 404 });
  if (!import.meta.env.DEV) return notFound();
  const slug = url.searchParams.get('slug') ?? '';
  if (!validBackupSlug(slug)) return notFound();
  const { findPhotoBackup } = await import('../../../lib/photo-backup-path');
  const backup = findPhotoBackup(slug);
  if (!backup) return notFound();
  const { lstat, readFile } = await import('node:fs/promises');
  try {
    const stat = await lstat(backup);
    if (!stat.isFile() || stat.size === 0 || stat.size > maxPhotoBytes) return notFound();
    const bytes = await readFile(backup);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return notFound();
    return new Response(new Uint8Array(bytes), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return notFound();
  }
};
