const TAG_RE = /#([a-zA-ZÀ-ÿ\u00f1\u00d1\w-]+)/g;

const TAG_COLOR =
  "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200";

export function tagColor(_tag: string): string {
  return TAG_COLOR;
}

export function getPartialTag(value: string): string | null {
  const match = value.match(/#([a-zA-ZÀ-ÿ\w-]*)$/);
  return match ? match[1].toLowerCase() : null;
}

export function parseTags(text: string): {
  display: string;
  tags: string[];
} {
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
