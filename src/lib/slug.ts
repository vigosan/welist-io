const SLUG_MAX_LENGTH = 60;

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function slugify(raw: string): string {
  const normalized = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (normalized.length <= SLUG_MAX_LENGTH) return normalized;
  return normalized.slice(0, SLUG_MAX_LENGTH).replace(/-+$/, "");
}
