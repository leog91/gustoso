/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { parse } from 'yaml';
import { markNeedsReview, parseRecipePreview } from '../src/lib/recipe-review';

describe('mark an approved recipe for review', () => {
  const base = '---\ntitle: Cherry Spiced Syrup\n# Keep this comment\ningredients:\n  - 250 g sugar\n---\n\nKeep these notes.\nneedsReview: false in the body\n';

  test('adds the flag without losing recipe data, comments or notes', () => {
    const output = markNeedsReview(base);
    const data = parse(output.split('---')[1]);
    expect(data.needsReview).toBe(true);
    expect(data.title).toBe('Cherry Spiced Syrup');
    expect(data.ingredients).toEqual(['250 g sugar']);
    expect(output).toContain('# Keep this comment');
    expect(output.slice(output.indexOf('\n---\n') + 5)).toBe(base.slice(base.indexOf('\n---\n') + 5));
  });

  test('updates an existing false flag and is idempotent', () => {
    const input = base.replace('title:', 'needsReview: false\ntitle:');
    const output = markNeedsReview(input);
    expect(parse(output.split('---')[1]).needsReview).toBe(true);
    expect(markNeedsReview(output)).toBe(output);
  });

  test('preserves CRLF line endings', () => {
    const output = markNeedsReview(base.replace(/\n/g, '\r\n'));
    expect(output).toContain('needsReview: true\r\n---\r\n');
    expect(output.replace(/\r\n/g, '')).not.toContain('\n');
  });

  test('rejects malformed or invalid frontmatter', () => {
    for (const input of ['No frontmatter', '---\ntitle: [\n---\n', '---\ntitle: One\ntitle: Two\n---\n', '---\ningredients: []\n---\n']) {
      expect(() => markNeedsReview(input)).toThrow();
    }
  });
});

describe('trash recipe preview', () => {
  test('reads flat ingredients and instructions plus notes without modifying the source', () => {
    const source = '---\ntitle: Syrup\ningredients:\n  - 250 g sugar\ninstructions:\n  - description: Bring to the boil.\nstorage: 3 days\n---\n<script>doNotExecute()</script>\n';
    const { data, body } = parseRecipePreview(source);
    expect(data.title).toBe('Syrup');
    expect(data.ingredients).toEqual(['250 g sugar']);
    expect(data.instructions?.[0].description).toBe('Bring to the boil.');
    expect(data.storage).toBe('3 days');
    expect(body).toBe('<script>doNotExecute()</script>\n');
  });

  test('reads multipart recipes and rejects malformed YAML for raw-source fallback', () => {
    const source = '---\ntitle: Trifle\nparts:\n  - name: Syrup\n    ingredients:\n      - 250 g sugar\n    storage: 3 days\n---\n';
    expect(parseRecipePreview(source).data.parts?.[0].name).toBe('Syrup');
    expect(parseRecipePreview(source).data.parts?.[0].storage).toBe('3 days');
    expect(() => parseRecipePreview('---\ntitle: [\n---\n')).toThrow();
  });
});
