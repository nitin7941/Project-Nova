import os from "node:os";
import path from "node:path";

/**
 * Writable root for Nova on-disk artifacts (RAG indexes, trace projects).
 * Local/dev: `.nova/` in the project. Vercel/serverless: `/tmp/nova` (only
 * writable path). Override with NOVA_DATA_DIR or legacy NOVA_INDEX_DIR.
 *
 * Note: `/tmp` on Vercel is ephemeral per instance — fine for demos, not
 * durable multi-user storage.
 */
export function novaDataDir(): string {
  return (
    process.env.NOVA_DATA_DIR ||
    process.env.NOVA_INDEX_DIR ||
    (process.env.VERCEL ? path.join(os.tmpdir(), "nova") : path.join(process.cwd(), ".nova"))
  );
}
