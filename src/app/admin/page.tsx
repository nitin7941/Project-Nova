import { headers } from "next/headers";

export default async function AdminPage() {
  const user = (await headers()).get("x-nova-user") ?? "unknown";

  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <div className="rounded-2xl border border-white/10 bg-[#12121b] p-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/15 px-3 py-1 text-xs font-medium text-fuchsia-300">
          Admin only
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Admin area</h1>
        <p className="mt-2 text-zinc-400">
          You are viewing an admin-only route, gated by role in{" "}
          <span className="font-mono">middleware.ts</span>. Signed in as{" "}
          <span className="font-mono text-zinc-200">{user}</span>.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Members are redirected away from here and blocked from privileged APIs such as{" "}
          <span className="font-mono">/api/rag/index</span>.
        </p>
      </div>
    </div>
  );
}
