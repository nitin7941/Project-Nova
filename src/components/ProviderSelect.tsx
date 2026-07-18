"use client";

import { useEffect, useState } from "react";
import type { LlmProviderId, ProviderAvailability } from "@/lib/claude";

const STORAGE_KEY = "nova-llm-provider";

type Props = {
  value: LlmProviderId;
  onChange: (provider: LlmProviderId) => void;
};

export function ProviderSelect({ value, onChange }: Props) {
  const [availability, setAvailability] = useState<ProviderAvailability | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data: { providers?: ProviderAvailability; defaults?: { preferred?: LlmProviderId } }) => {
        if (cancelled || !data.providers) return;
        setAvailability(data.providers);

        const saved = window.localStorage.getItem(STORAGE_KEY) as LlmProviderId | null;
        const preferred = data.defaults?.preferred ?? "auto";

        if (saved && isAllowed(saved, data.providers)) {
          onChange(saved);
        } else if (!isAllowed(value, data.providers)) {
          onChange(isAllowed(preferred, data.providers) ? preferred : "auto");
        }
      })
      .catch(() => {
        if (!cancelled) setAvailability({ anthropic: false, groq: false });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  function select(next: LlmProviderId) {
    onChange(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }

  const options: { id: LlmProviderId; label: string; hint: string; enabled: boolean }[] = [
    {
      id: "auto",
      label: "Auto",
      hint: "Best available",
      enabled: true,
    },
    {
      id: "groq",
      label: "Groq",
      hint: "Free",
      enabled: Boolean(availability?.groq),
    },
    {
      id: "anthropic",
      label: "Anthropic",
      hint: "Claude",
      enabled: Boolean(availability?.anthropic),
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-zinc-500">LLM</span>
      <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#0d0d15] p-1">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={!opt.enabled}
              title={
                opt.enabled
                  ? opt.hint
                  : `${opt.label} is unavailable — add the API key in .env.local`
              }
              onClick={() => select(opt.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "bg-white/10 text-white"
                  : opt.enabled
                    ? "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    : "cursor-not-allowed text-zinc-600 opacity-50"
              }`}
            >
              {opt.label}
              <span className="ml-1 text-[10px] opacity-70">{opt.hint}</span>
            </button>
          );
        })}
      </div>
      {availability && !availability.groq && !availability.anthropic && (
        <span className="text-[11px] text-amber-400/90">Add GROQ_API_KEY or ANTHROPIC_API_KEY</span>
      )}
    </div>
  );
}

function isAllowed(id: LlmProviderId, avail: ProviderAvailability): boolean {
  if (id === "auto") return true;
  if (id === "groq") return avail.groq;
  if (id === "anthropic") return avail.anthropic;
  return false;
}
