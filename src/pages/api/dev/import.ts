import type { APIRoute } from 'astro';

export const prerender = false;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers });

export const GET: APIRoute = async ({ url, request }) => {
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });
  try {
    const local = await import('../../../lib/recipe-import');
    const source = url.searchParams.get('pdf');
    if (source) {
      const fs = await import('node:fs');
      const { Readable } = await import('node:stream');
      const file = local.pdfPath(source);
      const size = fs.statSync(file).size;
      const pdfHeaders = { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline', 'Accept-Ranges': 'bytes' };
      const range = request.headers.get('range');
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        let start = match?.[1] ? Number(match[1]) : 0;
        let end = match?.[2] ? Number(match[2]) : size - 1;
        if (match && !match[1] && match[2]) { start = Math.max(0, size - Number(match[2])); end = size - 1; }
        if (!match || (!match[1] && !match[2]) || start > end || start >= size) {
          return new Response(null, { status: 416, headers: { ...pdfHeaders, 'Content-Range': `bytes */${size}` } });
        }
        end = Math.min(end, size - 1);
        // Node and DOM declare different reader overloads for the same Web Streams API.
        return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })) as unknown as ReadableStream<Uint8Array>, {
          status: 206, headers: { ...pdfHeaders, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
        });
      }
      return new Response(Readable.toWeb(fs.createReadStream(file)) as unknown as ReadableStream<Uint8Array>, {
        headers: { ...pdfHeaders, 'Content-Length': String(size) },
      });
    }
    return json(local.listImports());
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to read local imports.' }, 400);
  }
};

export const POST: APIRoute = async ({ request, url }) => {
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });
  // No cross-origin writes, including form posts from another website.
  if (request.headers.get('origin') !== url.origin || !request.headers.get('content-type')?.startsWith('application/json')) {
    return json({ error: 'Same-origin JSON requests only.' }, 403);
  }
  if (Number(request.headers.get('content-length')) > 500_000) return json({ error: 'Request too large.' }, 413);
  try {
    const text = await request.text();
    if (text.length > 500_000) return json({ error: 'Request too large.' }, 413);
    const input = JSON.parse(text);
    const local = await import('../../../lib/recipe-import');
    switch (input.action) {
      case 'extract': return json(await local.extractPdf(input.source));
      case 'create': return json(local.createDraft(input));
      case 'save': return json(local.saveDraft(input));
      case 'validate': return json(local.validateMarkdown(input.markdown));
      case 'approve': return json(local.approveDraft(input.id));
      case 'skip': return json(local.setDraftStatus(input.id, 'skipped'));
      case 'restore': return json(local.setDraftStatus(input.id, 'draft'));
      default: return json({ error: 'Unknown import action.' }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed.';
    return json({ error: message.includes('EEXIST') ? 'A recipe already exists with that slug. Choose a different slug; nothing was overwritten.' : message }, 400);
  }
};
