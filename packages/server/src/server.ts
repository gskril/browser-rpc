import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { existsSync } from "fs";
import path from "path";
import { handleRpcRequest, type RpcHandlerConfig } from "./rpc/handler";
import { api } from "./api/routes";
import type { JsonRpcRequest } from "./rpc/types";

// Resolve path to web dist folder
// After build/publish: web-dist is bundled with the package
// In development: falls back to ../web/dist

function resolveWebDistPath(): string {
  const bundledPath = path.resolve(import.meta.dir, "../web-dist");
  const devPath = path.resolve(import.meta.dir, "../../web/dist");
  // Prefer bundled path (for published package), fall back to dev path
  if (existsSync(bundledPath)) return bundledPath;
  return devPath;
}
const webDistPath = resolveWebDistPath();

export interface ServerConfig {
  upstreamRpcUrl: string;
  port: number;
  onPendingRequest: (id: string, url: string) => void;
}

export function createServer(config: ServerConfig) {
  const app = new Hono();

  // Middleware
  app.use("*", logger());
  app.use("*", cors());

  // Mount API routes
  app.route("/api", api);

  // RPC endpoint - handles both root and /rpc paths
  const handleRpc = async (c: any) => {
    try {
      const body = await c.req.json<JsonRpcRequest | JsonRpcRequest[]>();

      // Handle batch requests
      if (Array.isArray(body)) {
        const methods = body.map((req) => req.method).join(", ");
        console.log(`  RPC batch: [${methods}]`);
        const responses = await Promise.all(
          body.map((req) =>
            handleRpcRequest(req, {
              upstreamRpcUrl: config.upstreamRpcUrl,
              uiBaseUrl: `http://localhost:${config.port}`,
              onPendingRequest: config.onPendingRequest,
            })
          )
        );
        return c.json(responses);
      }

      // Single request
      console.log(`  RPC: ${body.method}`);
      const response = await handleRpcRequest(body, {
        upstreamRpcUrl: config.upstreamRpcUrl,
        uiBaseUrl: `http://localhost:${config.port}`,
        onPendingRequest: config.onPendingRequest,
      });

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error",
          },
        },
        400
      );
    }
  };

  app.post("/", handleRpc);
  app.post("/rpc", handleRpc);

  // Health check
  app.get("/health", (c) => c.json({ ok: true }));

  // Serve static assets from web dist
  app.use("/assets/*", serveStatic({ root: webDistPath }));

  // SPA fallback - serve index.html for all other GET requests
  app.get("*", async (c) => {
    const indexPath = path.join(webDistPath, "index.html");
    const file = Bun.file(indexPath);
    if (await file.exists()) {
      return c.html(await file.text());
    }
    return c.text("Web UI not found. Run 'bun run build' in packages/web first.", 404);
  });

  return app;
}
