/// <reference types="bun" />
import { afterAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

// All filesystem tests run in a disposable project, never the actual recipe collection.
const previousDirectory = process.cwd();
const project = fs.mkdtempSync('/tmp/opencode/gustoso-import-test-');
process.chdir(project);
fs.mkdirSync('src/content/recipes', { recursive: true });
fs.mkdirSync('temp');
fs.writeFileSync('temp/source.pdf', '%PDF-1.4\n');
const importer = await import('../src/lib/recipe-import');

afterAll(() => {
  process.chdir(previousDirectory);
  fs.rmSync(project, { recursive: true, force: true });
});

const recipe = `---
title: Test soup
needsReview: true
parts:
  - ingredients:
      - 200 g lentils
    instructions:
      - step: 1
        description: Cook the lentils.
---
Keep this recipe note.
`;
function draft(slug = 'test-soup') {
  return importer.createDraft({ title: 'Test soup', slug, source: 'source.pdf', pages: [1, 2], sourceText: 'Private source text, not published.' });
}

describe('local PDF recipe staging', () => {
  test('lists only regular PDFs and blocks traversal/symlinks', () => {
    fs.symlinkSync(path.join(project, 'temp/source.pdf'), 'temp/link.pdf');
    expect(importer.listImports().pdfs).toEqual(['source.pdf']);
    expect(() => importer.pdfPath('../source.pdf')).toThrow('Invalid PDF');
    expect(() => importer.pdfPath('link.pdf')).toThrow('regular file');
    expect(() => draft('../escape')).toThrow();
    expect(() => importer.readDraft('../escape')).toThrow();
  });

  test('creates local drafts without adding content files', () => {
    const item = draft('local-only');
    expect(importer.readDraft(item.id).sourceText).toContain('Private source');
    expect(item.markdown).not.toContain('Private source');
    expect(fs.readdirSync('src/content/recipes')).toEqual([]);
    expect(importer.listImports().drafts.some((saved) => saved.id === item.id)).toBe(true);
  });

  test('saves unfinished/invalid YAML locally for later correction', () => {
    const item = draft('unfinished');
    importer.saveDraft({ ...item, markdown: '---\ntitle: [\n---\n' });
    expect(importer.readDraft(item.id).markdown).toContain('title: [');
    expect(() => importer.approveDraft(item.id)).toThrow();
    expect(fs.existsSync('src/content/recipes/unfinished.md')).toBe(false);
  });

  test('schema validation rejects missing titles, wrong shapes, duplicate keys and malformed frontmatter', () => {
    for (const invalid of ['no frontmatter', '---\ntype: Soup\n---\n', '---\ntitle: Soup\nparts: wrong\n---\n', '---\ntitle: One\ntitle: Two\n---\n']) {
      expect(() => importer.validateMarkdown(invalid)).toThrow();
    }
    expect(importer.validateMarkdown(recipe).data.title).toBe('Test soup');
  });

  test('skipped drafts are retained and restorable, not approvable', () => {
    const item = draft('skipped-soup');
    expect(importer.setDraftStatus(item.id, 'skipped').status).toBe('skipped');
    expect(() => importer.approveDraft(item.id)).toThrow('active draft');
    expect(importer.setDraftStatus(item.id, 'draft').sourceText).toBe(item.sourceText);
  });

  test('empty templates and explicitly unpublished recipes cannot be approved', () => {
    const item = draft('empty-soup');
    expect(() => importer.approveDraft(item.id)).toThrow('ingredients or instructions');
    importer.saveDraft({ ...item, markdown: recipe.replace('needsReview: true', 'published: false') });
    expect(() => importer.approveDraft(item.id)).toThrow('published: false');
  });

  test('approval promotes exactly one recipe, removes review flag and keeps source metadata private', () => {
    const item = draft('approved-soup');
    importer.saveDraft({ ...item, markdown: recipe });
    expect(importer.approveDraft(item.id)).toEqual({ slug: 'approved-soup' });
    const content = fs.readFileSync('src/content/recipes/approved-soup.md', 'utf8');
    expect(content).toContain('200 g lentils');
    expect(content).toContain('Keep this recipe note.');
    expect(content).not.toContain('needsReview');
    expect(content).not.toContain('source.pdf');
    expect(content).not.toContain('Private source');
    expect(importer.readDraft(item.id).status).toBe('approved');
    expect(() => importer.approveDraft(item.id)).toThrow('active draft');
    expect(() => importer.saveDraft(item)).toThrow('already been approved');
  });

  test('existing recipes are never overwritten', () => {
    fs.writeFileSync('src/content/recipes/existing.md', 'original content');
    const item = draft('existing');
    importer.saveDraft({ ...item, markdown: recipe });
    expect(() => importer.approveDraft(item.id)).toThrow('EEXIST');
    expect(fs.readFileSync('src/content/recipes/existing.md', 'utf8')).toBe('original content');
    expect(importer.readDraft(item.id).status).toBe('draft');
  });
});
