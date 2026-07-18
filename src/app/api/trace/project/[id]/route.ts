import { NextResponse } from "next/server";
import {
  acknowledgeArtifact,
  deleteProject,
  ensureProject,
  getProject,
  toGraph,
  updateArtifactContent,
} from "@/lib/trace/store";
import type { TraceGraph, TraceProject } from "@/lib/trace/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json(toGraph(project));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { artifactId, content, action, snapshot } = await req.json();
    if (!artifactId || typeof artifactId !== "string") {
      return NextResponse.json({ error: "'artifactId' is required." }, { status: 400 });
    }

    if (snapshot && typeof snapshot === "object" && snapshot.id === id) {
      await ensureProject(snapshot as TraceProject | TraceGraph);
    }

    if (action === "acknowledge") {
      return NextResponse.json(await acknowledgeArtifact(id, artifactId));
    }

    if (typeof content !== "string") {
      return NextResponse.json({ error: "'content' is required." }, { status: 400 });
    }
    return NextResponse.json(await updateArtifactContent(id, artifactId, content));
  } catch (err) {
    console.error("[trace/project PATCH]", err);
    const message = err instanceof Error ? err.message : "Failed to update artifact.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteProject(id);
  return NextResponse.json({ ok: true });
}
