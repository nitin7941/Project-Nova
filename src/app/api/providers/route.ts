import { NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/claude";

/** Public availability flags only — never returns API keys. */
export async function GET() {
  const providers = getAvailableProviders();
  return NextResponse.json({
    providers,
    defaults: {
      preferred: providers.groq ? "groq" : providers.anthropic ? "anthropic" : "auto",
    },
  });
}
