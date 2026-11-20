import type { APIRoute } from 'astro';
import { defaultPhotoQuality, maxPhotoBytes, validBackupSlug } from '../../../lib/photo-settings';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });

export const POST: APIRoute = async ({ request, url }) => {
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });
  if (request.headers.get('origin') !== url.origin || request.headers.get('content-type') !== 'application/octet-stream') {
    return error('Same-origin photo requests only.', 403);
  }

  const quality = Number(url.searchParams.get('quality') ?? defaultPhotoQuality);
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) return error('Choose a quality from 1 to 100.', 400);
  const backup = url.searchParams.get('backup');
  const { optimizePhoto, savePhotoBackup } = await import('../../../lib/photo-optimizer');
  if (backup !== null && !validBackupSlug(backup)) return error('Enter the recipe slug, such as tiramisu-truffles.', 400);
  const tooLarge = () => error('Choose a photo no larger than 20 MB.', 413);
  if (Number(request.headers.get('content-length')) > maxPhotoBytes) return tooLarge();
  if (!request.body) return error('Choose a photo first.', 400);

  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxPhotoBytes) {
        await reader.cancel();
        return tooLarge();
      }
      chunks.push(value);
    }
  } catch {
    return error('Could not read the photo.', 400);
  } finally {
    reader.releaseLock();
  }
  if (!size) return error('Choose a photo first.', 400);

  let optimized: Awaited<ReturnType<typeof optimizePhoto>>;
  try {
    optimized = await optimizePhoto(Buffer.concat(chunks, size), quality);
  } catch {
    return error('Could not optimize this photo. Choose a valid still JPEG, PNG, or WebP under 50 megapixels.', 422);
  }
  const { data, info, original } = optimized;
  if (backup !== null) {
    try {
      const path = await savePhotoBackup(backup, data);
      return Response.json({ path }, { status: 201, headers });
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === 'EEXIST') {
        return error('A backup already exists for this slug. Nothing was overwritten.', 409);
      }
      return error('Could not save the backup in src/assets/recipe-img/.', 500);
    }
  }
  return new Response(new Uint8Array(data), {
    headers: {
      ...headers,
      'Content-Type': 'image/jpeg',
      'X-Original-Dimensions': `${original.width}x${original.height}`,
      'X-Optimized-Dimensions': `${info.width}x${info.height}`,
    },
  });
};
