const TAG_RE = /#([a-zA-ZÀ-ÿ\u00f1\u00d1\w-]+)/g;

const TAG_COLOR = "border-gray-200 text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700";

export function tagColor(_tag: string): string {
  return TAG_COLOR;
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
