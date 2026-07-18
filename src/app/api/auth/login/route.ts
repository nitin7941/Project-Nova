import { NextResponse } from "next/server";
import { authenticate, createToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const session = authenticate(String(username), String(password));
    if (!session) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = await createToken(session);
    const res = NextResponse.json({ user: session.user, role: session.role });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
