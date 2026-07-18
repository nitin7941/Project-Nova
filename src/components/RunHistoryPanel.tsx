"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  clearRunHistory,
  loadRunHistory,
  previewText,
  type RunHistoryEntry,
} from "@/lib/runHistory";

type Props = {
  /** When set, only show runs for this feature. */
  featureSlug?: string;
  onRestore?: (entry: RunHistoryEntry) => void;
  compact?: boolean;
};

export function RunHistoryPanel({ featureSlug, onRestore, compact }: Props) {
  const [entries, setEntries] = useState<RunHistoryEntry[]>([]);

  function refresh() {
    const all = loadRunHistory();
    setEntries(featureSlug ? all.filter((e) => e.featureSlug === featureSlug) : all);
  }

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "nova-run-history") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("nova-run-history", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("nova-run-history", refresh as EventListener);
    };
  }, [featureSlug]);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-[#0d0d15]/60 px-3 py-4 text-center text-xs text-zinc-500">
        No runs yet — results you generate will show up here.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d15]">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <p className="text-xs font-medium text-zinc-400">
          {featureSlug ? "Recent runs" : "Recent activity"}
        </p>
        <button
          type="button"
          onClick={() => {
            clearRunHistory();
            setEntries([]);
            window.dispatchEvent(new Event("nova-run-history"));
          }}
          className="text-[11px] text-zinc-500 transition hover:text-zinc-300"
        >
          Clear
        </button>
      </div>
      <ul className={`divide-y divide-white/5 ${compact ? "max-h-48" : "max-h-72"} overflow-y-auto`}>
        {entries.slice(0, compact ? 6 : 12).map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onRestore?.(entry)}
              className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-white/5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-200">
                  {featureSlug ? previewText(entry.input, 72) : entry.featureName}
                </span>
                <span className="shrink-0 text-[10px] text-zinc-600">
                  {formatRelative(entry.createdAt)}
                </span>
              </div>
              {!featureSlug && (
                <span className="text-[11px] text-zinc-500">{previewText(entry.input, 80)}</span>
              )}
              {featureSlug && (
                <span className="text-[11px] text-zinc-500">{previewText(entry.output, 90)}</span>
              )}
              {!onRestore && (
                <Link
                  href={`/${entry.featureSlug === "chat" ? "chat" : entry.featureSlug}`}
                  className="mt-0.5 text-[11px] text-fuchsia-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open →
                </Link>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
