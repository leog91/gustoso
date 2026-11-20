export const maxPhotoBytes = 20 * 1024 * 1024;
export const photoMaxSide = 1200;
export const defaultPhotoQuality = 75;

export function validBackupSlug(slug: string) {
  return slug.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
