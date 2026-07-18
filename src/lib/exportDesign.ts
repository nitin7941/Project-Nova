/** Client-side helpers for exporting a design document. */

import type { jsPDF } from "jspdf";
import { normalizeMermaidChart } from "@/lib/mermaidFix";

export function downloadMarkdown(content: string, filename = "project-nova-design.md") {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load diagram image."));
    img.src = src;
  });
}

/** Expand 8-digit hex (#RRGGBBAA) which some SVG→canvas paths mishandle. */
function sanitizeSvgMarkup(svg: string): string {
  return svg.replace(/#([0-9a-fA-F]{8})\b/g, (_m, hex: string) => {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
  });
}

/**
 * Render a Mermaid chart with a print-friendly light theme and return a PNG data URL.
 */
async function mermaidChartToPng(chart: string, maxWidth = 700): Promise<{ dataUrl: string; width: number; height: number }> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "default",
    darkMode: false,
    fontFamily: "Helvetica, Arial, sans-serif",
    themeVariables: {
      background: "#ffffff",
      primaryColor: "#fff7ed",
      primaryTextColor: "#111111",
      primaryBorderColor: "#f59e0b",
      secondaryColor: "#f3f4f6",
      tertiaryColor: "#ffffff",
      lineColor: "#4b5563",
      textColor: "#111111",
      mainBkg: "#fff7ed",
      nodeBorder: "#d97706",
      clusterBkg: "#f9fafb",
      titleColor: "#111111",
      edgeLabelBackground: "#ffffff",
    },
  });

  const id = `pdf-mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { svg } = await mermaid.render(id, normalizeMermaidChart(chart));

  const mount = document.createElement("div");
  mount.style.cssText = "position:fixed;left:-10000px;top:0;width:700px;visibility:hidden;";
  mount.innerHTML = sanitizeSvgMarkup(svg);
  document.body.appendChild(mount);

  try {
    const svgEl = mount.querySelector("svg");
    if (!svgEl) throw new Error("Mermaid did not return an SVG.");

    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgEl.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    let width = 700;
    let height = 400;
    const viewBox = svgEl.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        width = parts[2];
        height = parts[3];
      }
    } else {
      const w = svgEl.getAttribute("width");
      const h = svgEl.getAttribute("height");
      if (w) width = parseFloat(w) || width;
      if (h) height = parseFloat(h) || height;
    }

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));

    const serialized = sanitizeSvgMarkup(new XMLSerializer().serializeToString(svgEl));
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    try {
      const img = await loadImage(url);
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return {
        dataUrl: canvas.toDataURL("image/png"),
        width,
        height,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    mount.remove();
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  }
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "mermaid"; chart: string }
  | { type: "code"; text: string };

function stripInlineMd(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/, "")
    .trim();
}

/** Split design markdown into printable blocks (including mermaid fences). */
function parseDesignBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const fence = line.trim().match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1].toLowerCase();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence
      const text = body.join("\n").trim();
      if (lang === "mermaid") {
        blocks.push({ type: "mermaid", chart: text });
      } else if (text) {
        blocks.push({ type: "code", text });
      }
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: stripInlineMd(heading[2]),
      });
      i += 1;
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      blocks.push({ type: "bullet", text: stripInlineMd(bullet[1]) });
      i += 1;
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Gather paragraph lines
    const para: string[] = [stripInlineMd(line)];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      para.push(stripInlineMd(lines[i]));
      i += 1;
    }
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

class PdfWriter {
  pdf: jsPDF;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  y: number;
  bottom: number;

  constructor(pdf: jsPDF, margin = 48) {
    this.pdf = pdf;
    this.margin = margin;
    this.pageWidth = pdf.internal.pageSize.getWidth();
    this.pageHeight = pdf.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - margin * 2;
    this.y = margin;
    // Keep a comfortable bottom gutter so descenders never clip.
    this.bottom = this.pageHeight - margin;
  }

  ensureSpace(needed: number) {
    if (this.y + needed > this.bottom) {
      this.pdf.addPage();
      this.y = this.margin;
    }
  }

  addTitle(title: string) {
    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(20, 20, 30);
    this.ensureSpace(22);
    this.pdf.text(title, this.margin, this.y + 12);
    this.y += 28;
  }

  addHeading(level: 1 | 2 | 3, text: string) {
    const sizes = { 1: 15, 2: 13, 3: 11 };
    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(sizes[level]);
    this.pdf.setTextColor(20, 20, 30);
    const lines = this.pdf.splitTextToSize(text, this.contentWidth) as string[];
    const lineH = sizes[level] * 1.25;
    this.ensureSpace(lineH * lines.length + 10);
    this.y += 8;
    for (const line of lines) {
      this.pdf.text(line, this.margin, this.y + sizes[level] * 0.8);
      this.y += lineH;
    }
    this.y += 4;
  }

  addParagraph(text: string) {
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(30, 30, 40);
    const lines = this.pdf.splitTextToSize(text, this.contentWidth) as string[];
    const lineH = 14;
    this.ensureSpace(lineH * lines.length + 6);
    for (const line of lines) {
      this.ensureSpace(lineH);
      this.pdf.text(line, this.margin, this.y + 10);
      this.y += lineH;
    }
    this.y += 4;
  }

  addBullet(text: string) {
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(30, 30, 40);
    const bulletIndent = 14;
    const lines = this.pdf.splitTextToSize(text, this.contentWidth - bulletIndent) as string[];
    const lineH = 14;
    this.ensureSpace(lineH * lines.length + 2);
    this.pdf.text("•", this.margin, this.y + 10);
    for (let i = 0; i < lines.length; i++) {
      this.ensureSpace(lineH);
      this.pdf.text(lines[i], this.margin + bulletIndent, this.y + 10);
      this.y += lineH;
    }
    this.y += 2;
  }

  addCode(text: string) {
    this.pdf.setFont("courier", "normal");
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(30, 30, 40);
    const lines = text.split("\n");
    const lineH = 12;
    this.ensureSpace(lineH * lines.length + 12);
    for (const line of lines) {
      const wrapped = this.pdf.splitTextToSize(line || " ", this.contentWidth) as string[];
      for (const w of wrapped) {
        this.ensureSpace(lineH);
        this.pdf.text(w, this.margin, this.y + 9);
        this.y += lineH;
      }
    }
    this.y += 8;
  }

  addImage(dataUrl: string, imgWidthPx: number, imgHeightPx: number) {
    // Fit image to content width; move to next page if it won't fit.
    let drawW = this.contentWidth;
    let drawH = (imgHeightPx * drawW) / imgWidthPx;

    const maxH = this.bottom - this.margin - 8;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = (imgWidthPx * drawH) / imgHeightPx;
    }

    this.ensureSpace(drawH + 16);
    this.y += 8;
    this.pdf.addImage(dataUrl, "PNG", this.margin, this.y, drawW, drawH);
    this.y += drawH + 12;
  }
}

/**
 * Build a PDF from the design markdown + light-theme Mermaid diagrams.
 * Uses jsPDF text APIs (not html2canvas) so lines are never clipped mid-glyph.
 */
export async function exportDesignPdf(
  title: string,
  markdown: string,
  filename = "project-nova-design.pdf",
) {
  if (!markdown.trim()) return;

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const writer = new PdfWriter(pdf);
  writer.addTitle(title);

  const blocks = parseDesignBlocks(markdown);

  for (const block of blocks) {
    if (block.type === "heading") {
      writer.addHeading(block.level, block.text);
    } else if (block.type === "paragraph") {
      writer.addParagraph(block.text);
    } else if (block.type === "bullet") {
      writer.addBullet(block.text);
    } else if (block.type === "code") {
      writer.addCode(block.text);
    } else if (block.type === "mermaid") {
      try {
        const { dataUrl, width, height } = await mermaidChartToPng(block.chart);
        writer.addImage(dataUrl, width, height);
      } catch (err) {
        console.error("[exportDesignPdf] diagram failed", err);
        writer.addParagraph("[Diagram could not be rendered]");
      }
    }
  }

  // Extra bottom breathing room on the last page (prevents edge flush).
  writer.ensureSpace(12);
  writer.y += 8;

  pdf.save(filename);
}
