import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseDocument, stringify } from 'yaml';
import { z } from 'astro/zod';
import { recipeSchema } from './recipe-schema';

const tempDir = path.resolve('temp');
const draftsDir = path.join(tempDir, 'recipe-drafts');
const recipesDir = path.resolve('src/content/recipes');
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a kebab-case slug (letters, numbers, hyphens).').max(120);
const idSchema = z.string().uuid();
const draftSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  source: z.string().max(255),
  pages: z.array(z.number().int().positive()).max(500),
  sourceText: z.string().max(200_000),
  markdown: z.string().max(200_000),
  status: z.enum(['draft', 'skipped', 'approved']),
  updatedAt: z.string(),
});
type Draft = z.infer<typeof draftSchema>;

// Refuse symlinked storage/source paths: these tools must never read/write outside the project.
function ensureDirectories() {
  for (const dir of [tempDir, draftsDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    if (fs.lstatSync(dir).isSymbolicLink() || !fs.lstatSync(dir).isDirectory()) {
      throw new Error('Local import directories must be real directories, not symlinks.');
    }
  }
}

export function pdfPath(name: string) {
  ensureDirectories();
  if (path.basename(name) !== name || !name.toLowerCase().endsWith('.pdf')) throw new Error('Invalid PDF filename.');
  const file = path.join(tempDir, name);
  if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) throw new Error('PDF must be a regular file in temp/.');
  if (fs.statSync(file).size > 500 * 1024 * 1024) throw new Error('PDF is too large (maximum 500 MB).');
  return file;
}

function draftPath(id: string) {
  ensureDirectories();
  return path.join(draftsDir, `${idSchema.parse(id)}.json`);
}

export function readDraft(id: string): Draft {
  const file = draftPath(id);
  if (fs.lstatSync(file).isSymbolicLink()) throw new Error('Invalid draft file.');
  return draftSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function writeDraft(draft: Draft) {
  const file = draftPath(draft.id);
  const temporary = path.join(draftsDir, `${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, JSON.stringify(draft, null, 2), { flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return draft;
}

export function listImports() {
  ensureDirectories();
  const pdfs = fs.readdirSync(tempDir).filter((name) => {
    if (!name.toLowerCase().endsWith('.pdf')) return false;
    const stat = fs.lstatSync(path.join(tempDir, name));
    return stat.isFile() && !stat.isSymbolicLink();
  }).sort();
  return { pdfs, drafts: listRecipeDrafts() };
}

export function listRecipeDrafts() {
  ensureDirectories();
  return fs.readdirSync(draftsDir).filter((name) => /^[\da-f-]{36}\.json$/.test(name))
    .map((name) => readDraft(name.slice(0, -5))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function validateMarkdown(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error('Recipe must start with YAML frontmatter between --- lines.');
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length) throw new Error(document.errors.map((error) => error.message).join('\n'));
  const data = recipeSchema.parse(document.toJS({ maxAliasCount: 20 }));
  return { data, body: match[2] };
}

export function createDraft(input: unknown) {
  const { title, source, pages, sourceText, slug } = z.object({
    title: z.string().trim().min(1).max(200),
    slug: slugSchema,
    source: z.string().max(255),
    pages: z.array(z.number().int().positive()).min(1).max(500),
    sourceText: z.string().trim().min(1).max(200_000),
  }).parse(input);
  pdfPath(source);
  const markdown = `---\n${stringify({ title, needsReview: true, parts: [{ ingredients: [], instructions: [] }] })}---\n`;
  return writeDraft({ id: randomUUID(), slug, source, pages, sourceText, markdown, status: 'draft', updatedAt: new Date().toISOString() });
}

export function saveDraft(input: unknown) {
  const { id, slug, markdown } = z.object({ id: idSchema, slug: slugSchema, markdown: z.string().max(200_000) }).parse(input);
  const draft = readDraft(id);
  if (draft.status === 'approved') throw new Error('This draft has already been approved.');
  return writeDraft({ ...draft, slug, markdown, updatedAt: new Date().toISOString() });
}

export function setDraftStatus(id: string, status: 'draft' | 'skipped') {
  const draft = readDraft(id);
  if (draft.status === 'approved') throw new Error('This draft has already been approved.');
  return writeDraft({ ...draft, status, updatedAt: new Date().toISOString() });
}

export function approveDraft(id: string) {
  const draft = readDraft(id);
  if (draft.status !== 'draft') throw new Error('Only an active draft can be approved.');
  const { data, body } = validateMarkdown(draft.markdown);
  const parts = data.parts?.length ? data.parts : [data];
  if (!parts.some((part) => part.ingredients?.some((item) => item.trim()) || part.instructions?.some((item) => item.description.trim()))) {
    throw new Error('Add ingredients or instructions before approving.');
  }
  if (data.published === false) throw new Error('Remove published: false before approving for publication.');
  if (fs.lstatSync(recipesDir).isSymbolicLink()) throw new Error('Recipe directory must not be a symlink.');
  const destination = path.join(recipesDir, `${slugSchema.parse(draft.slug)}.md`);
  // Exclusive creation also prevents overwrites if two approvals happen at once.
  const { needsReview: _, ...approved } = data;
  fs.writeFileSync(destination, `---\n${stringify(approved)}---\n${body}`, { flag: 'wx' });
  writeDraft({ ...draft, status: 'approved', updatedAt: new Date().toISOString() });
  return { slug: draft.slug };
}

export async function extractPdf(name: string) {
  const { getDocumentProxy, extractText } = await import('unpdf');
  const document = await getDocumentProxy(new Uint8Array(fs.readFileSync(pdfPath(name))));
  try {
    if (document.numPages > 500) throw new Error('PDF exceeds the 500-page import limit.');
    return await extractText(document, { mergePages: false });
  } finally {
    await document.loadingTask.destroy();
  }
}
