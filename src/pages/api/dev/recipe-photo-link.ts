import type { APIRoute } from 'astro';
import { validBackupSlug } from '../../../lib/photo-settings';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });

export const POST: APIRoute = async ({ request, url }) => {
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });
  if (request.headers.get('origin') !== url.origin || !request.headers.get('content-type')?.startsWith('application/json')) {
    return error('Same-origin JSON requests only.', 403);
  }
  const slug = url.searchParams.get('slug') ?? '';
  if (!validBackupSlug(slug)) return error('Enter a valid recipe slug.', 400);
  if (Number(request.headers.get('content-length')) > 8192) return error('Request too large.', 413);
  const { editRecipeImage, isImageKitUrl } = await import('../../../lib/recipe-photo-link');
  try {
    const input = await request.json();
    if (typeof input?.expected !== 'string' || input.expected.length > 3000
      || (input.url !== null && (typeof input.url !== 'string' || input.url.length > 3000 || !isImageKitUrl(input.url)))) {
      return error('Provide an ImageKit URL or remove the current image link.', 400);
    }
    const { lstatSync, readFileSync, writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { listRecipeDrafts, saveDraft, validateMarkdown } = await import('../../../lib/recipe-import');
    const directory = 'src/content/recipes';
    if (!lstatSync(directory).isDirectory()) throw new Error('Recipe directory must not be a symlink.');
    const path = join(directory, `${slug}.md`);
    const stat = lstatSync(path, { throwIfNoEntry: false });
    if (stat) {
      if (!stat.isFile()) throw new Error('Recipe must be a regular Markdown file.');
      const next = editRecipeImage(readFileSync(path, 'utf8'), input.expected, input.url);
      validateMarkdown(next);
      writeFileSync(path, next);
      return Response.json({ target: 'recipe' }, { headers });
    }
    const drafts = listRecipeDrafts().filter((draft) => draft.slug === slug && draft.status === 'draft');
    if (!drafts.length) return error('No recipe file or active draft exists for this backup.', 404);
    if (drafts.length > 1) return error('More than one active draft uses this slug. Give each draft a unique slug first.', 409);
    const draft = drafts[0];
    const markdown = editRecipeImage(draft.markdown, input.expected, input.url);
    validateMarkdown(markdown);
    saveDraft({ id: draft.id, slug, markdown });
    return Response.json({ target: 'draft' }, { headers });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : 'Could not update the recipe image.', 400);
  }
};
