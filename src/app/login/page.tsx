"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-[#12121b] p-6">
        <h1 className="text-xl font-bold tracking-tight">Sign in to Project Nova</h1>
        <p className="mt-1 text-sm text-zinc-400">Role-based access to the platform.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="w-full rounded-xl border border-white/10 bg-[#0d0d15] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-fuchsia-500/60"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/10 bg-[#0d0d15] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-fuchsia-500/60"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-xs text-zinc-500">
          Demo accounts: <span className="font-mono">admin / nova</span> (admin) ·{" "}
          <span className="font-mono">member / nova</span> (member). Configure real users via{" "}
          <span className="font-mono">NOVA_USERS</span>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
