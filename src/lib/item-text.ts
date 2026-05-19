import { stripInlineMarkdown } from "./inline-markdown";
import { parsePlaces } from "./places";
import { parseTags } from "./tags";

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
