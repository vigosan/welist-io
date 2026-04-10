const TAG_RE = /#([a-zA-ZÀ-ÿ\u00f1\u00d1\w-]+)/g;

const TAG_COLORS = [
  "border-red-300 text-red-600 bg-red-50 hover:bg-red-100",
  "border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100",
  "border-yellow-300 text-yellow-600 bg-yellow-50 hover:bg-yellow-100",
  "border-green-300 text-green-600 bg-green-50 hover:bg-green-100",
  "border-teal-300 text-teal-600 bg-teal-50 hover:bg-teal-100",
  "border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100",
  "border-indigo-300 text-indigo-600 bg-indigo-50 hover:bg-indigo-100",
  "border-purple-300 text-purple-600 bg-purple-50 hover:bg-purple-100",
  "border-pink-300 text-pink-600 bg-pink-50 hover:bg-pink-100",
] as const;

export function tagColor(tag: string): string {
  const sum = [...tag].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return TAG_COLORS[sum % TAG_COLORS.length];
}

export function getPartialTag(value: string): string | null {
  const match = value.match(/#([a-zA-ZÀ-ÿ\w-]*)$/);
  return match ? match[1].toLowerCase() : null;
}

export function parseTags(text: string): { display: string; tags: string[] } {
  const tags: string[] = [];
  const display = text
    .replace(TAG_RE, (_, tag) => {
      tags.push(tag.toLowerCase());
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { display, tags };
}
