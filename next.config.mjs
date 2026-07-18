import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project so Next doesn't infer a parent
  // directory (there are other lockfiles under /var/www/html).
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  // transformers.js ships a native ONNX runtime; keep it out of the bundle
  // so it loads correctly at runtime on the server.
  serverExternalPackages: ["@huggingface/transformers"],
};

export default nextConfig;
