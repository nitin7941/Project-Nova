import Link from "next/link";
import { features } from "@/lib/features";
import { hasAnthropic, hasGroq, providerLabel } from "@/lib/claude";

export default function Home() {
  const badgeClass = hasAnthropic
    ? "bg-emerald-500/15 text-emerald-300"
    : hasGroq
      ? "bg-sky-500/15 text-sky-300"
      : "bg-amber-500/15 text-amber-300";

  return (
    <div>
      <section className="py-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
          AI Developer Productivity Platform
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Ship faster with{" "}
          <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
            Project Nova
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
          Your AI copilot across the software lifecycle — review code, generate tests and docs, and
          turn requirements into system designs. Powered by Claude, grounded in your project context.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/review"
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            Try Code Review
          </Link>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
            {providerLabel()}
            {!hasAnthropic && !hasGroq ? " · set GROQ_API_KEY or ANTHROPIC_API_KEY" : " connected"}
          </span>
        </div>
      </section>

      <section className="mt-6 grid gap-5 sm:grid-cols-2">
        {features.map((f) => (
          <Link
            key={f.slug}
            href={f.href}
            className="group rounded-2xl border border-white/10 bg-[#12121b] p-6 transition hover:border-white/20 hover:bg-[#15151f]"
          >
            <div className="flex items-center gap-4">
              <div
                className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.accent} text-2xl`}
              >
                {f.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{f.name}</h3>
                <p className="text-xs text-zinc-500">Owner: {f.owner}</p>
              </div>
              <span className="ml-auto text-zinc-600 transition group-hover:translate-x-1 group-hover:text-zinc-300">
                →
              </span>
            </div>
            <p className="mt-4 text-sm text-zinc-400">{f.tagline}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
