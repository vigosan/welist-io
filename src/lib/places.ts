const PLACE_RE =
  /@([a-zA-ZÀ-ÿ\u00f1\u00d1\w]+(?: [a-zA-ZÀ-ÿ\u00f1\u00d1\w]+)*)/g;

export const PARTIAL_PLACE_REGEX = /@([^@#]*[^\s@#])$/;

export function getPartialPlace(value: string): string | null {
  const match = value.match(PARTIAL_PLACE_REGEX);
  return match ? match[1] : null;
}

export function parsePlaces(text: string): {
  display: string;
  places: string[];
} {
  const places: string[] = [];
  const display = text
    .replace(PLACE_RE, (_, place) => {
      places.push(place);
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { display, places };
}
