/** URL-safe slug from a title. Strips accents, lowercases, hyphenates. */
export function slugify(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Canonical public path for an activity detail page. */
export function activityPath(activity: { id: number; title?: string }): string {
  const slug = slugify(activity.title || '');
  return slug ? `/extraescolars/${activity.id}/${slug}` : `/extraescolars/${activity.id}`;
}
