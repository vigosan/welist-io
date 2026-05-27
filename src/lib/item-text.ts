import { stripInlineMarkdown } from "./inline-markdown.js";
import { parsePlaces } from "./places.js";
import { parseTags } from "./tags.js";

export function parseItemText(text: string): {
  display: string;
  tags: string[];
  places: string[];
} {
  const { display: withoutTags, tags } = parseTags(text);
  const { display, places } = parsePlaces(withoutTags);
  return { display, tags, places };
}

export function plainItemText(text: string): string {
  return stripInlineMarkdown(parseItemText(text).display);
}
