const TAG_RE = /#([\p{L}\p{N}_-]+)/gu;
const PLACE_RE =
  /@([a-zA-ZÀ-ÿñÑ\w]+(?: [a-zA-ZÀ-ÿñÑ\w]+)*)/g;

export function displayItemText(text: string): string {
  return text
    .replace(TAG_RE, "")
    .replace(PLACE_RE, (_, place) => place)
    .replace(/\s+/g, " ")
    .trim();
}
