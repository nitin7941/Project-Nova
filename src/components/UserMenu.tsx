"use client";

import { useRouter } from "next/navigation";
import type { Role } from "@/lib/auth";

export function UserMenu({ user, role }: { user: string; role: Role }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-zinc-400">
        {user}
        <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300">
          {role}
        </span>
      </span>
      <button
        onClick={logout}
        className="rounded-lg border border-white/10 px-2.5 py-1 text-zinc-300 transition hover:bg-white/5"
      >
        Sign out
      </button>
    </div>
  );
}
