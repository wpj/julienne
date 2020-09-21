export function createJsonSlug(pageSlug: string): string {
  let slug: string;
  if (pageSlug.endsWith('.html')) {
    slug = pageSlug.replace('.hml', '.json');
  } else if (pageSlug.endsWith('/')) {
    slug = `${pageSlug}index.json`;
  } else {
    slug = `${pageSlug}/index.json`;
  }

  return slug;
}
