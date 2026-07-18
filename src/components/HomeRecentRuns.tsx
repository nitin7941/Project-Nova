"use client";

import { RunHistoryPanel } from "@/components/RunHistoryPanel";
import { featureBySlug } from "@/lib/features";
import type { RunHistoryEntry } from "@/lib/runHistory";

/** Homepage wrapper — restoring a run navigates to that feature. */
export function HomeRecentRuns() {
  function onRestore(entry: RunHistoryEntry) {
    const feature = featureBySlug(entry.featureSlug);
    const href = feature?.href ?? `/${entry.featureSlug}`;
    try {
      sessionStorage.setItem(
        "nova-restore-run",
        JSON.stringify({ featureSlug: entry.featureSlug, id: entry.id }),
      );
    } catch {
      /* ignore */
    }
    window.location.href = href;
  }

  return <RunHistoryPanel onRestore={onRestore} />;
}
