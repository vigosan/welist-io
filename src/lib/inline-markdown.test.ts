import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { renderInlineMarkdown, stripInlineMarkdown } from "./inline-markdown";

function toHtml(nodes: ReturnType<typeof renderInlineMarkdown>): string {
  return nodes
    .map((n) => {
      if (typeof n === "string") return n;
      const el = n as ReactElement<{
        href?: string;
        children?: unknown;
        className?: string;
      }>;
      const inner =
        typeof el.props.children === "string" ? el.props.children : "";
      const tag = el.type as string;
      if (tag === "a") return `<a href="${el.props.href}">${inner}</a>`;
      return `<${tag}>${inner}</${tag}>`;
    })
    .join("");
}

describe("stripInlineMarkdown", () => {
  it("returns plain text unchanged", () => {
    expect(stripInlineMarkdown("hello world")).toBe("hello world");
  });

  it("flattens a markdown link to its label", () => {
    expect(
      stripInlineMarkdown("[Torre del Visco](https://torredelvisco.com)")
    ).toBe("Torre del Visco");
  });

  it("flattens bold, italic and code", () => {
    expect(stripInlineMarkdown("**a** *b* `c`")).toBe("a b c");
  });

  it("drops bare URLs", () => {
    expect(stripInlineMarkdown("ver https://example.com ahora")).toBe(
      "ver ahora"
    );
  });

  it("flattens a mix of link and tags-free text", () => {
    expect(
      stripInlineMarkdown("[Parador](https://paradores.es) de Bielsa")
    ).toBe("Parador de Bielsa");
  });
});

describe("renderInlineMarkdown", () => {
  it("returns plain text unchanged", () => {
    expect(toHtml(renderInlineMarkdown("hello world"))).toBe("hello world");
  });

  it("renders **bold**", () => {
    expect(toHtml(renderInlineMarkdown("**bold**"))).toBe(
      "<strong>bold</strong>"
    );
  });

  it("renders *italic*", () => {
    expect(toHtml(renderInlineMarkdown("*italic*"))).toBe("<em>italic</em>");
  });

  it("renders [text](url) as link", () => {
    expect(toHtml(renderInlineMarkdown("[click](https://x.com)"))).toBe(
      '<a href="https://x.com">click</a>'
    );
  });

  it("renders `code`", () => {
    expect(toHtml(renderInlineMarkdown("`code`"))).toBe("<code>code</code>");
  });

  it("renders mixed bold and italic", () => {
    expect(toHtml(renderInlineMarkdown("**bold** y *italic*"))).toBe(
      "<strong>bold</strong> y <em>italic</em>"
    );
  });

  it("does not process markdown inside backticks", () => {
    expect(toHtml(renderInlineMarkdown("`**no bold**`"))).toBe(
      "<code>**no bold**</code>"
    );
  });

  it("ignores non-http links", () => {
    const result = toHtml(renderInlineMarkdown("[click](ftp://bad.com)"));
    expect(result).not.toContain("<a");
    expect(result).toContain("click");
  });

  it("renders bare URLs as links", () => {
    const result = toHtml(
      renderInlineMarkdown("visita https://example.com hoy")
    );
    expect(result).toContain('<a href="https://example.com">');
  });

  it("text with no markdown stays unchanged", () => {
    const nodes = renderInlineMarkdown("simple text");
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toBe("simple text");
  });

  it("renders text before and after bold", () => {
    expect(toHtml(renderInlineMarkdown("antes **importante** después"))).toBe(
      "antes <strong>importante</strong> después"
    );
  });
});
