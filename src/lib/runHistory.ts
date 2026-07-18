/** Client-side run history for feature workbenches (localStorage). */

export type RunHistoryEntry = {
  id: string;
  featureSlug: string;
  featureName: string;
  input: string;
  output: string;
  mode?: string;
  createdAt: number;
};

const STORAGE_KEY = "nova-run-history";
const MAX_ENTRIES = 30;

export function loadRunHistory(): RunHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RunHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRunHistory(entries: RunHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* quota / private mode */
  }
}

export function addRunHistoryEntry(
  entry: Omit<RunHistoryEntry, "id" | "createdAt"> & { id?: string; createdAt?: number },
): RunHistoryEntry[] {
  const next: RunHistoryEntry = {
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: entry.createdAt ?? Date.now(),
    featureSlug: entry.featureSlug,
    featureName: entry.featureName,
    input: entry.input,
    output: entry.output,
    mode: entry.mode,
  };
  const merged = [next, ...loadRunHistory().filter((e) => e.id !== next.id)].slice(0, MAX_ENTRIES);
  saveRunHistory(merged);
  return merged;
}

export function clearRunHistory() {
  saveRunHistory([]);
}

export function previewText(text: string, max = 96): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}
