/**
 * LLMs often mix Mermaid diagram types (e.g. flowchart header + sequence syntax).
 * Normalize common mistakes so client-side mermaid.render() succeeds more often.
 */
export function normalizeMermaidChart(raw: string): string {
  let chart = raw.trim();
  if (!chart) return chart;

  // Strip a mistaken language tag if the model put "mermaid" inside the fence body.
  chart = chart.replace(/^mermaid\s*\n/i, "");

  const looksLikeSequence =
    /\bparticipant\b/i.test(chart) ||
    /->>/.test(chart) ||
    /-->>/.test(chart) ||
    /\bactor\b/i.test(chart);

  const looksLikeFlowchart =
    /\bflowchart\b/i.test(chart) ||
    /^\s*graph\s+(TB|BT|LR|RL|TD)\b/im.test(chart) ||
    /-->/.test(chart);

  const hasSequenceHeader = /^\s*sequenceDiagram\b/im.test(chart);
  const hasFlowHeader =
    /^\s*(flowchart|graph)\s+(TB|BT|LR|RL|TD)\b/im.test(chart) ||
    /^\s*flowchart\b/im.test(chart);

  // Case: "graph LR" / "flowchart …" + participant / ->>  → treat as sequence diagram
  if (looksLikeSequence && !hasSequenceHeader) {
    chart = chart.replace(/^\s*(flowchart|graph)(\s+\w+)?\s*\n/i, "");
    chart = `sequenceDiagram\n${chart.trim()}`;
  }

  // Case: sequence arrows but no header and no flowchart header
  if (looksLikeSequence && !/^\s*sequenceDiagram\b/im.test(chart) && !hasFlowHeader) {
    chart = `sequenceDiagram\n${chart.trim()}`;
  }

  // Case: flowchart without a header but with --> links
  if (
    looksLikeFlowchart &&
    !looksLikeSequence &&
    !/^\s*(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram)/im.test(chart)
  ) {
    chart = `flowchart LR\n${chart.trim()}`;
  }

  // Normalize deprecated "graph" → "flowchart" when it's actually a flowchart
  if (/^\s*graph\s+(TB|BT|LR|RL|TD)\b/im.test(chart) && !looksLikeSequence) {
    chart = chart.replace(/^\s*graph\s+/im, "flowchart ");
  }

  // Sequence diagrams: fix `participant X as "Label With Spaces"` → participant X as Label_With_Spaces
  // (quoted aliases with special chars sometimes break older parsers)
  if (/^\s*sequenceDiagram\b/im.test(chart)) {
    chart = chart.replace(
      /^\s*participant\s+(\w+)\s+as\s+"([^"]+)"\s*$/gim,
      (_m, id: string, label: string) => {
        const safe = label.replace(/[^a-zA-Z0-9 ]/g, "").trim() || id;
        return `    participant ${id} as ${safe}`;
      },
    );
    // Ensure arrow lines use a simple form Frontend->>Backend: message
    chart = chart.replace(/\s*->>\s*/g, "->>");
    chart = chart.replace(/\s*-->>\s*/g, "-->>");
  }

  // Flowcharts: LLMs often write -->|label|> instead of -->|label|
  // (extra > after the label pipe breaks Mermaid 11 parse).
  if (/^\s*(flowchart|graph)\b/im.test(chart) || /-->/.test(chart)) {
    chart = chart.replace(/(\|[^\n|]*?)\|>(\s*)/g, "$1|$2");
  }

  return chart.trim();
}
