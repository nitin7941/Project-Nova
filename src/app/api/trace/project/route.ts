import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/trace/store";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[trace/project GET]", err);
    return NextResponse.json({ projects: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { name, requirement, indexId } = await req.json();
    if (!requirement || typeof requirement !== "string" || !requirement.trim()) {
      return NextResponse.json({ error: "A 'requirement' is required." }, { status: 400 });
    }
    const graph = await createProject(String(name ?? ""), requirement, indexId ?? null);
    return NextResponse.json(graph);
  } catch (err) {
    console.error("[trace/project POST]", err);
    return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  }
}
