"use client";

type Props = {
  label?: string;
};

/** Animated loading panel while Nova generates a response. */
export function LoadingOutput({ label = "Asking Nova…" }: Props) {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-400" />
        </span>
        <span className="nova-shimmer-text font-medium">{label}</span>
      </div>
      <div className="space-y-2">
        <div className="nova-skeleton h-3 w-11/12 rounded" />
        <div className="nova-skeleton h-3 w-full rounded" />
        <div className="nova-skeleton h-3 w-4/5 rounded" />
        <div className="nova-skeleton h-3 w-9/12 rounded" />
        <div className="nova-skeleton mt-4 h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
