import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

// Reachable without a session.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

// Require the "admin" role. Indexing a repo is treated as a privileged action.
const ADMIN_PATHS = ["/admin", "/api/admin", "/api/rag/index"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function needsAdmin(pathname: string): boolean {
  return ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const session = await verifyToken(req.cookies.get(COOKIE_NAME)?.value);
  const isApi = pathname.startsWith("/api/");

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (needsAdmin(pathname) && session.role !== "admin") {
    if (isApi) {
      return NextResponse.json({ error: "Admin role required." }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Surface the identity to downstream handlers.
  const res = NextResponse.next();
  res.headers.set("x-nova-user", session.user);
  res.headers.set("x-nova-role", session.role);
  return res;
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
