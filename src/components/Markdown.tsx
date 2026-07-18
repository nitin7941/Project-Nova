"use client";

import { MermaidDiagram } from "@/components/MermaidDiagram";

/**
 * Tiny Markdown renderer with Mermaid fence support.
 * Handles headings, bold, inline code, fenced code blocks, and bullet lists.
 * Non-mermaid content is HTML-escaped first, so it is safe to dangerouslySetInnerHTML.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_m, c) => `<strong>${c}</strong>`);
}

export function markdownToHtml(md: string): string {
  const lines = escapeHtml(md).split("\n");
  const out: string[] = [];
  let inCode = false;
  let inList = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${renderInline(para.join(" "))}</p>`);
    }
    para = [];
  };
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    const fence = line.trim().startsWith("```");
    if (fence) {
      flushPara();
      closeList();
      if (!inCode) {
        out.push("<pre><code>");
        inCode = true;
      } else {
        out.push("</code></pre>");
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      out.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara();
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${renderInline(bullet[1])}</li>`);
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      closeList();
      continue;
    }

    para.push(line);
  }

  flushPara();
  closeList();
  if (inCode) out.push("</code></pre>");

  return out.join("\n");
}

type Segment =
  | { type: "markdown"; content: string }
  | { type: "mermaid"; content: string };

/** Split markdown into prose segments and ```mermaid``` fences. */
export function splitMarkdownSegments(md: string): Segment[] {
  const segments: Segment[] = [];
  const fenceRe = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRe.exec(md)) !== null) {
    const [full, lang, body] = match;
    if (match.index > lastIndex) {
      segments.push({ type: "markdown", content: md.slice(lastIndex, match.index) });
    }
    if (lang.trim().toLowerCase() === "mermaid") {
      segments.push({ type: "mermaid", content: body.trim() });
    } else {
      segments.push({ type: "markdown", content: full });
    }
    lastIndex = match.index + full.length;
  }

  if (lastIndex < md.length) {
    segments.push({ type: "markdown", content: md.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "markdown", content: md }];
}

export function Markdown({ content }: { content: string }) {
  const segments = splitMarkdownSegments(content);

  return (
    <div className="prose-nova space-y-3 text-[0.95rem] text-zinc-200">
      {segments.map((segment, i) =>
        segment.type === "mermaid" ? (
          <MermaidDiagram key={`m-${i}`} chart={segment.content} />
        ) : (
          <div
            key={`t-${i}`}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(segment.content) }}
          />
        ),
      )}
    </div>
  );
}
