/**
 * Generate a bookmark-safe slug from heading text.
 */
export function slugifyBookmark(text: string): string {
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 31);

  if (!slug) {
    if (text.trim().length > 0) {
      let hash = 0;
      for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
      }
      slug = `h${Math.abs(hash).toString(36)}`;
    } else {
      slug = 'heading';
    }
  }

  return slug;
}

/**
 * Get a unique bookmark name, appending a counter suffix if needed.
 */
export function getUniqueBookmarkName(text: string, tracker: Map<string, number>): string {
  const base = `_Toc_${slugifyBookmark(text)}`;
  const count = tracker.get(base) || 0;
  tracker.set(base, count + 1);

  if (count === 0) {
    return base.slice(0, 40);
  }
  return `${base}_${count + 1}`.slice(0, 40);
}
