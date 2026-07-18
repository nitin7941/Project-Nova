import Link from "next/link";
import { features } from "@/lib/features";

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-blue-600 text-sm">
            ✦
          </span>
          <span className="tracking-tight">Project Nova</span>
        </Link>
        <div className="ml-auto hidden items-center gap-1 text-sm text-zinc-400 sm:flex">
          {features.map((f) => (
            <Link
              key={f.slug}
              href={f.href}
              className="rounded-lg px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
            >
              {f.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
