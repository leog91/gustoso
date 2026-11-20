import { parseDocument } from 'yaml';
import { recipeSchema } from './recipe-schema';

export function markNeedsReview(markdown: string) {
  const match = markdown.match(/^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))([\s\S]*)$/);
  if (!match) throw new Error('Recipe must have YAML frontmatter between --- lines.');
  const document = parseDocument(match[2], { uniqueKeys: true });
  if (document.errors.length) throw new Error(document.errors.map((error) => error.message).join('\n'));
  recipeSchema.parse(document.toJS({ maxAliasCount: 20 }));
  document.set('needsReview', true);
  const newline = match[1].includes('\r\n') ? '\r\n' : '\n';
  const frontmatter = document.toString({ lineWidth: 0 }).replace(/\n$/, '').replace(/\r?\n/g, newline);
  return `${match[1]}${frontmatter}${match[3]}${match[4]}`;
}

export function parseRecipePreview(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error('Recipe must have YAML frontmatter between --- lines.');
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length) throw new Error(document.errors.map((error) => error.message).join('\n'));
  return { data: recipeSchema.parse(document.toJS({ maxAliasCount: 20 })), body: match[2] };
}
