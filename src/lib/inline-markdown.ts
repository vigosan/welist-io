import type { ReactNode } from "react";
import { createElement } from "react";

const CODE_RE = /`([^`]+)`/g;
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const ITALIC_RE = /\*([^*]+)\*/g;
const BARE_URL_RE = /https?:\/\/\S+/g;

type Segment =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "link"; text: string; href: string }
  | { type: "url"; href: string };

function splitBy(
  input: string,
  re: RegExp,
  makeSegment: (match: RegExpExecArray) => Segment
): Array<{ type: "text"; value: string } | Segment> {
  const result: Array<{ type: "text"; value: string } | Segment> = [];
  let last = 0;
  re.lastIndex = 0;
  let m = re.exec(input);
  while (m !== null) {
    if (m.index > last)
      result.push({
        type: "text",
        value: input.slice(last, m.index),
      });
    result.push(makeSegment(m));
    last = m.index + m[0].length;
    m = re.exec(input);
  }
  if (last < input.length)
    result.push({ type: "text", value: input.slice(last) });
  return result;
}

function processText(text: string): Segment[] {
  const withLinks = splitBy(text, LINK_RE, (m) => ({
    type: "link" as const,
    text: m[1],
    href: m[2],
  }));
  const withBare: Segment[] = [];
  for (const seg of withLinks) {
    if (seg.type !== "text") {
      withBare.push(seg);
      continue;
    }
    for (const s of splitBy(seg.value, BARE_URL_RE, (m) => ({
      type: "url" as const,
      href: m[0],
    })))
      withBare.push(s);
  }
  const withBold: Segment[] = [];
  for (const seg of withBare) {
    if (seg.type !== "text") {
      withBold.push(seg);
      continue;
    }
    for (const s of splitBy(seg.value, BOLD_RE, (m) => ({
      type: "bold" as const,
      value: m[1],
    })))
      withBold.push(s);
  }
  const withItalic: Segment[] = [];
  for (const seg of withBold) {
    if (seg.type !== "text") {
      withItalic.push(seg);
      continue;
    }
    for (const s of splitBy(seg.value, ITALIC_RE, (m) => ({
      type: "italic" as const,
      value: m[1],
    })))
      withItalic.push(s);
  }
  return withItalic;
}

export function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let key = 0;
  const parts = splitBy(text, CODE_RE, (m) => ({
    type: "code" as const,
    value: m[1],
  }));
  for (const part of parts) {
    if (part.type === "code") {
      nodes.push(
        createElement(
          "code",
          {
            key: key++,
            className: "bg-gray-100 px-1 rounded text-xs font-mono",
          },
          part.value
        )
      );
      continue;
    }
    for (const seg of processText("value" in part ? part.value : "")) {
      if (seg.type === "text") {
        nodes.push(seg.value);
        continue;
      }
      if (seg.type === "bold") {
        nodes.push(createElement("strong", { key: key++ }, seg.value));
        continue;
      }
      if (seg.type === "italic") {
        nodes.push(createElement("em", { key: key++ }, seg.value));
        continue;
      }
      if (seg.type === "link") {
        nodes.push(
          createElement(
            "a",
            {
              key: key++,
              href: seg.href,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "underline text-gray-600 hover:text-gray-900",
            },
            seg.text
          )
        );
        continue;
      }
      if (seg.type === "url") {
        nodes.push(
          createElement(
            "a",
            {
              key: key++,
              href: seg.href,
              target: "_blank",
              rel: "noopener noreferrer",
              className:
                "underline text-gray-600 hover:text-gray-900 break-all",
            },
            seg.href
          )
        );
      }
    }
  }
  return nodes;
}

export function stripInlineMarkdown(text: string): string {
  return text
    .replace(LINK_RE, "$1")
    .replace(CODE_RE, "$1")
    .replace(BOLD_RE, "$1")
    .replace(ITALIC_RE, "$1")
    .replace(BARE_URL_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}
