"use client";

import { useEffect, useId, useState } from "react";
import { normalizeMermaidChart } from "@/lib/mermaidFix";

type Props = {
  chart: string;
};

/**
 * Client-only Mermaid renderer. Dynamically imports the library so the
 * design page stays SSR-safe and the bundle for other routes stays lean.
 */
export function MermaidDiagram({ chart }: Props) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const normalized = normalizeMermaidChart(chart);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError("");
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "dark",
          darkMode: true,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          themeVariables: {
            primaryColor: "#f59e0b33",
            primaryTextColor: "#f5f5ff",
            primaryBorderColor: "#f59e0b88",
            lineColor: "#a1a1aa",
            secondaryColor: "#1c1c28",
            tertiaryColor: "#0d0d15",
            background: "#0d0d15",
            mainBkg: "#12121b",
            nodeBorder: "#f59e0b66",
            clusterBkg: "#12121b",
            titleColor: "#f5f5ff",
            edgeLabelBackground: "#12121b",
          },
        });

        const id = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg: rendered } = await mermaid.render(id, normalized);
        if (!cancelled) setSvg(rendered);
      } catch (err) {
        if (!cancelled) {
          setSvg("");
          setError(err instanceof Error ? err.message : "Failed to render diagram.");
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [normalized, reactId]);

  if (error) {
    return (
      <div className="mermaid-fallback rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
        <p className="mb-2 font-medium">Couldn’t render Mermaid diagram</p>
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-zinc-300">{normalized}</pre>
        <p className="mt-2 text-xs text-amber-300/80">{error}</p>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0d0d15] px-4 py-8 text-center text-sm text-zinc-500">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram overflow-x-auto rounded-xl border border-white/10 bg-[#0d0d15] p-4"
      data-mermaid-chart={normalized}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
