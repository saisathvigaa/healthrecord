import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { runMigrations } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Create DB tables if they don't exist yet (safe on every restart)
  await runMigrations();

  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Diagnostic endpoint — checks DB table existence and row counts
  app.get("/api/debug/db", async (_req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const url = process.env.DATABASE_URL;
      if (!url) return res.json({ error: "DATABASE_URL not set" });

      let conn: import("mysql2/promise").Connection | null = null;
      try {
        const u = new URL(url);
        conn = await mysql.default.createConnection({
          host: u.hostname,
          port: u.port ? parseInt(u.port) : 3306,
          user: decodeURIComponent(u.username),
          password: decodeURIComponent(u.password),
          database: u.pathname.replace(/^\//, ""),
          ssl: { rejectUnauthorized: false },
        });

        const tables: Record<string, number | string> = {};
        for (const table of ["users", "biomarkers", "reports", "readings"]) {
          try {
            const [rows] = await conn.execute(`SELECT COUNT(*) as cnt FROM \`${table}\``);
            tables[table] = (rows as any)[0].cnt;
          } catch (e: any) {
            tables[table] = `ERROR: ${e.message}`;
          }
        }
        return res.json({ ok: true, tables });
      } finally {
        if (conn) await conn.end().catch(() => {});
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
