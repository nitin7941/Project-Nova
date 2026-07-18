import Link from "next/link";
import { cookies } from "next/headers";
import { features } from "@/lib/features";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { UserMenu } from "@/components/UserMenu";

export async function Nav() {
  const session = await verifyToken((await cookies()).get(COOKIE_NAME)?.value);

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
          {session?.role === "admin" && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
            >
              Admin
            </Link>
          )}
        </div>
        {session && (
          <div className="ml-2">
            <UserMenu user={session.user} role={session.role} />
          </div>
        )}
      </nav>
    </header>
  );
}
