export type SlashAction = "bold" | "italic" | "code" | "link" | "place" | "tag";

export interface SlashQuery {
  query: string;
  start: number;
}

/**
 * Detects an active "/" command at the caret. The slash must be the first
 * character or be preceded by whitespace (so URLs like https://… and text like
 * "X/Y" never trigger), and no whitespace may sit between the slash and caret.
 */
export function getSlashQuery(value: string, caret: number): SlashQuery | null {
  const before = value.slice(0, caret);
  const match = before.match(/(?:^|\s)\/([^\s/]*)$/);
  if (!match) return null;
  const query = match[1];
  return { query, start: caret - query.length - 1 };
}

interface ApplyArgs {
  value: string;
  start: number;
  caret: number;
  action: SlashAction;
  placeholder: string;
  urlPlaceholder?: string;
}

export interface SlashResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export function applySlashAction({
  value,
  start,
  caret,
  action,
  placeholder,
  urlPlaceholder = "url",
}: ApplyArgs): SlashResult {
  const head = value.slice(0, start);
  const tail = value.slice(caret);

  let snippet: string;
  let selFrom: number;
  let selTo: number;

  switch (action) {
    case "bold":
      snippet = `**${placeholder}**`;
      selFrom = 2;
      selTo = 2 + placeholder.length;
      break;
    case "italic":
      snippet = `*${placeholder}*`;
      selFrom = 1;
      selTo = 1 + placeholder.length;
      break;
    case "code":
      snippet = `\`${placeholder}\``;
      selFrom = 1;
      selTo = 1 + placeholder.length;
      break;
    case "link":
      snippet = `[${placeholder}](${urlPlaceholder})`;
      selFrom = 1;
      selTo = 1 + placeholder.length;
      break;
    case "place":
      snippet = "@";
      selFrom = 1;
      selTo = 1;
      break;
    case "tag":
      snippet = "#";
      selFrom = 1;
      selTo = 1;
      break;
  }

  return {
    value: head + snippet + tail,
    selectionStart: head.length + selFrom,
    selectionEnd: head.length + selTo,
  };
}
