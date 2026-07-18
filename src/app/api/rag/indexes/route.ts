import { NextResponse } from "next/server";
import { listIndexes } from "@/lib/rag/store";

export async function GET() {
  try {
    const indexes = await listIndexes();
    return NextResponse.json({ indexes });
  } catch (err) {
    console.error("[rag/indexes]", err);
    return NextResponse.json({ indexes: [] });
  }
}
