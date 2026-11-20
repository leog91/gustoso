const uploadEndpoint = 'https://upload.imagekit.io/api/v1/files/upload';

export async function uploadRecipePhoto(jpeg: Blob, slug: string, privateKey: string, send: (url: string, init: RequestInit) => Promise<Response> = fetch) {
  const filename = `${slug}.jpg`;
  const form = new FormData();
  form.set('file', jpeg, filename);
  form.set('fileName', filename);
  form.set('folder', '/gustoso/recipes');
  form.set('useUniqueFileName', 'true');
  const response = await send(uploadEndpoint, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}` },
    body: form,
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error('ImageKit rejected the API key. Check that it has media write access.');
  }
  if (!response.ok) throw new Error(`ImageKit upload failed (HTTP ${response.status}).`);
  const payload = await response.json().catch(() => null);
  const link: unknown = payload?.url;
  if (typeof link !== 'string' || !URL.canParse(link) || new URL(link).protocol !== 'https:') {
    throw new Error('ImageKit did not return an HTTPS image URL. Check the Media Library before retrying.');
  }
  return link;
}
