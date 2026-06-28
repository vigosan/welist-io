import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "@vercel/og";
import type { ReactElement } from "react";

const fontDir = join(dirname(fileURLToPath(import.meta.url)), "fonts");
const fonts = [
  { name: "Space Grotesk", file: "SpaceGrotesk-Regular.ttf", weight: 400 },
  { name: "Space Grotesk", file: "SpaceGrotesk-Medium.ttf", weight: 500 },
  { name: "Space Grotesk", file: "SpaceGrotesk-Bold.ttf", weight: 700 },
].map((f) => ({
  name: f.name,
  data: readFileSync(join(fontDir, f.file)),
  weight: f.weight as 400 | 500 | 700,
  style: "normal" as const,
}));

export type OgData = {
  name: string;
  ownerName: string | null;
  itemCount: number;
  participantCount: number;
};

type El = {
  type: string;
  props: { style?: Record<string, unknown>; children?: unknown };
};

function el(
  type: string,
  style: Record<string, unknown>,
  children?: unknown
): El {
  return { type, props: { style, children } };
}

const WIDTH = 1200;
const HEIGHT = 630;

export function renderOgImage(data: OgData): ImageResponse {
  const meta = [
    `${data.itemCount} ${data.itemCount === 1 ? "item" : "items"}`,
    data.participantCount > 0
      ? `${data.participantCount} ${data.participantCount === 1 ? "participant" : "participants"}`
      : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const tree = el(
    "div",
    {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      backgroundColor: "#fafaf8",
      padding: "72px",
      fontFamily: "Space Grotesk",
    },
    [
      el(
        "div",
        {
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#86868b",
        },
        "welist"
      ),
      el("div", { display: "flex", flexDirection: "column" }, [
        el(
          "div",
          {
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#1a1a1a",
            // satori needs explicit wrapping for long titles
            display: "flex",
          },
          data.name
        ),
        el(
          "div",
          { marginTop: 28, fontSize: 30, color: "#6b6b67" },
          data.ownerName ? `by ${data.ownerName}` : ""
        ),
      ]),
      el(
        "div",
        {
          fontSize: 28,
          color: "#1a1a1a",
          fontWeight: 500,
        },
        meta
      ),
    ]
  );

  return new ImageResponse(tree as unknown as ReactElement, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });
}
