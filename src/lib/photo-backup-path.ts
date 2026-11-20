import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validBackupSlug } from './photo-settings';

const directory = 'src/assets/recipe-img';
const legacyNames = new Map([
  ['burrata-e-prosciutto', 'burrata_and_crudo'],
  ['chimi-clasico', 'chimi'],
  ['smashed-avocado', 'smashed_avocado'],
]);

export function findPhotoBackup(slug: string) {
  if (!validBackupSlug(slug)) return undefined;
  const legacyName = legacyNames.get(slug);
  const names = legacyName ? [slug, legacyName] : [slug];
  return names.map((name) => `${directory}/${name}.jpg`).find((path) => existsSync(join(process.cwd(), path)));
}

export function listPhotoBackups() {
  const legacySlugs = new Map([...legacyNames].map(([slug, name]) => [name, slug]));
  const slugs = new Set(readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.jpg'))
    .map((entry) => entry.name.slice(0, -4))
    .map((name) => legacySlugs.get(name) ?? name)
    .filter(validBackupSlug));
  return [...slugs].flatMap((slug) => {
    const path = findPhotoBackup(slug);
    if (!path) return [];
    const info = statSync(path, { throwIfNoEntry: false });
    return info?.isFile() ? [{ slug, filename: path.split('/').at(-1), bytes: info.size }] : [];
  });
}
