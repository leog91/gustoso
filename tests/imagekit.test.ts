import { expect, test } from 'bun:test';
import { uploadRecipePhoto } from '../src/lib/imagekit';

const jpeg = new Blob(['sample'], { type: 'image/jpeg' });

test('uploads the saved JPEG with server-side authentication and a unique name', async () => {
  const url = 'https://ik.imagekit.io/test/gustoso/recipes/sample.jpg';
  const send = async (input: string, init: RequestInit) => {
    expect(input).toBe('https://upload.imagekit.io/api/v1/files/upload');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe(`Basic ${btoa('test-key:')}`);
    const form = init?.body as FormData;
    expect(form.get('fileName')).toBe('sample.jpg');
    expect(form.get('folder')).toBe('/gustoso/recipes');
    expect(form.get('useUniqueFileName')).toBe('true');
    expect(await (form.get('file') as File).text()).toBe('sample');
    return Response.json({ url });
  };
  expect(await uploadRecipePhoto(jpeg, 'sample', 'test-key', send)).toBe(url);
});

test('rejects bad credentials and non-HTTPS links', async () => {
  const forbidden = async () => new Response(null, { status: 403 });
  await expect(uploadRecipePhoto(jpeg, 'sample', 'test-key', forbidden)).rejects.toThrow('rejected the API key');
  const invalid = async () => Response.json({ url: 'http://example.com/image.jpg' });
  await expect(uploadRecipePhoto(jpeg, 'sample', 'test-key', invalid)).rejects.toThrow('did not return an HTTPS image URL');
});
