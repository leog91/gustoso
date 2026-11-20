import { isMap, isScalar, parseDocument } from 'yaml';

export function isImageKitUrl(value: string) {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && url.hostname === 'ik.imagekit.io'
    && !url.username && !url.password && !url.port && !url.hash;
}

export function editRecipeImage(markdown: string, expected: string, url: string | null) {
  const match = /^(---(\r?\n))([\s\S]*?)(\r?\n---(?:\r?\n|$)[\s\S]*)$/.exec(markdown);
  if (!match) throw new Error('Recipe must start with YAML frontmatter.');
  const [, start, eol, frontmatter, end] = match;
  const doc = parseDocument(frontmatter);
  if (doc.errors.length || !isMap(doc.contents) || doc.contents.flow) {
    throw new Error('Recipe must have valid block-style YAML frontmatter.');
  }
  const field = doc.contents.items.find(({ key }) => isScalar(key) && key.value === 'img');
  const current = doc.get('img');
  if ((typeof current === 'string' ? current.trim() : '') !== expected) {
    throw new Error('The recipe image changed elsewhere. Reload the photo library and try again.');
  }
  if (url === current || (!field && !url)) return markdown;
  if (!field) return `${start}img: ${JSON.stringify(url)}${eol}${frontmatter}${end}`;
  if (!isScalar(field.key) || !field.key.range || !isScalar(field.value) || !field.value.range) {
    throw new Error('The img field must be a scalar value.');
  }
  const [from, to, trailing] = field.value.range;
  if (url) {
    const block = field.value.type === 'BLOCK_FOLDED' || field.value.type === 'BLOCK_LITERAL';
    const newline = block && /\r?\n$/.test(frontmatter.slice(from, to)) ? eol : '';
    return `${start}${frontmatter.slice(0, from)}${from === to ? ' ' : ''}${JSON.stringify(url)}${newline}${frontmatter.slice(to)}${end}`;
  }
  const line = frontmatter.lastIndexOf('\n', field.key.range[0] - 1) + 1;
  if (frontmatter.slice(line, field.key.range[0]).trim()) throw new Error('The img field must start on its own line.');
  const prefix = frontmatter.slice(0, line);
  return `${start}${trailing === frontmatter.length ? prefix.replace(/\r?\n$/, '') : prefix}${frontmatter.slice(trailing)}${end}`;
}
