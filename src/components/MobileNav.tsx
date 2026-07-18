"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Feature } from "@/lib/features";

type Props = {
  features: Feature[];
  showAdmin?: boolean;
};

export function MobileNav({ features, showAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:bg-white/5"
      >
        <span className="sr-only">Menu</span>
        <span className="flex w-4 flex-col gap-1">
          <span
            className={`h-0.5 w-full rounded bg-current transition ${open ? "translate-y-1.5 rotate-45" : ""}`}
          />
          <span className={`h-0.5 w-full rounded bg-current transition ${open ? "opacity-0" : ""}`} />
          <span
            className={`h-0.5 w-full rounded bg-current transition ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
          />
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-40 border-b border-white/10 bg-[#0a0a0f] px-4 py-3 shadow-xl animate-in">
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {features.map((f) => {
                const active = pathname === f.href;
                return (
                  <Link
                    key={f.slug}
                    href={f.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="text-lg">{f.icon}</span>
                    <span>
                      <span className="block font-medium">{f.name}</span>
                      <span className="block text-xs text-zinc-500">{f.tagline}</span>
                    </span>
                  </Link>
                );
              })}
              {showAdmin && (
                <Link
                  href="/admin"
                  className={`rounded-xl px-3 py-2.5 text-sm transition ${
                    pathname === "/admin"
                      ? "bg-white/10 text-white"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
