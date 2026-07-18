import Link from "next/link";
import { features } from "@/lib/features";
import { hasAnthropic, hasGroq, providerLabel } from "@/lib/claude";
import { HomeRecentRuns } from "@/components/HomeRecentRuns";

export default function Home() {
  const badgeClass = hasAnthropic
    ? "bg-emerald-500/15 text-emerald-300"
    : hasGroq
      ? "bg-sky-500/15 text-sky-300"
      : "bg-amber-500/15 text-amber-300";

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#12121b]/80 px-6 py-12 text-center sm:px-10 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(40rem 20rem at 50% -10%, rgba(192, 38, 211, 0.22), transparent 70%)",
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
            AI Developer Productivity Platform
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Ship faster with{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              Project Nova
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Review code, generate tests and docs, design systems, chat with your repo, and catch
            drift — grounded in your project context.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/chat"
              className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              Chat with your Codebase
            </Link>
            <Link
              href="/design"
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Requirements → Design
            </Link>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
              {providerLabel()}
              {!hasAnthropic && !hasGroq ? " · set GROQ_API_KEY or ANTHROPIC_API_KEY" : " connected"}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Capabilities</h2>
            <p className="text-sm text-zinc-500">Pick a module and start generating.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Link
              key={f.slug}
              href={f.href}
              className="group rounded-2xl border border-white/10 bg-[#12121b] p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#15151f]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${f.accent} text-xl`}
                >
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">{f.name}</h3>
                  <p className="text-xs text-zinc-500">Owner: {f.owner}</p>
                </div>
                <span className="ml-auto text-zinc-600 transition group-hover:translate-x-1 group-hover:text-zinc-300">
                  →
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{f.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Recent runs</h2>
          <HomeRecentRuns />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#12121b] p-5">
          <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
          <ol className="mt-3 space-y-3 text-sm text-zinc-400">
            <li>
              <span className="font-medium text-zinc-200">1. Index</span> — add a repo in Chat so
              features can pull project context.
            </li>
            <li>
              <span className="font-medium text-zinc-200">2. Choose a tool</span> — review, tests,
              docs, design, or trace.
            </li>
            <li>
              <span className="font-medium text-zinc-200">3. Pick an LLM</span> — Groq (free) or
              Anthropic Claude.
            </li>
          </ol>
          <Link
            href="/chat"
            className="mt-4 inline-flex text-sm font-medium text-fuchsia-400 hover:underline"
          >
            Open Chat →
          </Link>
        </div>
      </section>
    </div>
  );
}
