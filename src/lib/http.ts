/** Parse a fetch Response as JSON; surface HTML/500 pages as a clear Error. */
export async function readJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(res.ok ? "Empty response from server." : `Request failed (${res.status}).`);
  }
  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) {
    throw new Error(
      `Server returned an HTML error page (${res.status}). ` +
        `This usually means a serverless crash — try again after a redeploy, or run locally.`,
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Server returned invalid JSON."
        : `Request failed (${res.status}): ${trimmed.slice(0, 160)}`,
    );
  }
}
