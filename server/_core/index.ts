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

        // Get a real userId, reportId, biomarkerId to test with
        let testInsertResult: any = "skipped";
        try {
          const [userRows] = await conn.execute(`SELECT id FROM \`users\` LIMIT 1`);
          const [bioRows] = await conn.execute(`SELECT id FROM \`biomarkers\` LIMIT 1`);
          const [repRows] = await conn.execute(`SELECT id FROM \`reports\` LIMIT 1`);
          const userId = (userRows as any)[0]?.id;
          const biomarkerId = (bioRows as any)[0]?.id;
          const reportId = (repRows as any)[0]?.id;
          if (userId && biomarkerId && reportId) {
            try {
              await conn.execute(
                `INSERT INTO \`readings\` (\`userId\`, \`reportId\`, \`biomarkerId\`, \`value\`, \`status\`, \`readingDate\`) VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, reportId, biomarkerId, "99.9", "normal", new Date()]
              );
              // Clean up test row
              await conn.execute(`DELETE FROM \`readings\` WHERE \`value\` = '99.9' LIMIT 1`);
              testInsertResult = "SUCCESS";
            } catch (e: any) {
              testInsertResult = `FAILED: ${e.message} (code=${e.code})`;
            }
          } else {
            testInsertResult = `missing ids: userId=${userId} biomarkerId=${biomarkerId} reportId=${reportId}`;
          }
        } catch (e: any) {
          testInsertResult = `lookup error: ${e.message}`;
        }

        // Show readings table columns for schema verification
        let readingsCols: string[] = [];
        try {
          const [cols] = await conn.execute(`SHOW COLUMNS FROM \`readings\``);
          readingsCols = (cols as any[]).map(c => `${c.Field}(${c.Type})`);
        } catch {}

        // Also test via drizzle ORM (this is what the app actually uses)
        let drizzleInsertResult: any = "skipped";
        try {
          const { getDb } = await import("../db");
          const { readings: readingsTable, biomarkers: biomarkersTable } = await import("../../drizzle/schema");
          const drizzleDb = await getDb();
          if (!drizzleDb) {
            drizzleInsertResult = "ERROR: drizzle db not available";
          } else {
            // Get real IDs from DB
            const [firstUser] = await conn.execute(`SELECT id FROM \`users\` LIMIT 1`);
            const [firstBio] = await conn.execute(`SELECT id FROM \`biomarkers\` LIMIT 1`);
            const [firstRep] = await conn.execute(`SELECT id FROM \`reports\` LIMIT 1`);
            const testUserId = (firstUser as any)[0]?.id;
            const testBioId = (firstBio as any)[0]?.id;
            const testRepId = (firstRep as any)[0]?.id;
            if (testUserId && testBioId && testRepId) {
              try {
                const result = await drizzleDb.insert(readingsTable).values({
                  userId: testUserId,
                  reportId: testRepId,
                  biomarkerId: testBioId,
                  value: "drizzle_test",
                  status: "normal" as const,
                  readingDate: new Date(),
                });
                const raw = result as any;
                drizzleInsertResult = `SUCCESS insertId=${raw?.[0]?.insertId ?? raw?.insertId}`;
                // Clean up
                const { eq } = await import("drizzle-orm");
                await drizzleDb.delete(readingsTable).where(eq(readingsTable.value, "drizzle_test"));
              } catch (e: any) {
                drizzleInsertResult = `FAILED: ${e.message} (code=${e.code})`;
              }
            } else {
              drizzleInsertResult = `skipped: missing ids u=${testUserId} b=${testBioId} r=${testRepId}`;
            }
          }
        } catch (e: any) {
          drizzleInsertResult = `setup error: ${e.message}`;
        }

        // Test the actual saveExtractedBiomarkers function end-to-end
        let saveFnResult: any = "skipped";
        try {
          const { saveExtractedBiomarkers } = await import("../extraction");
          const [ur] = await conn.execute(`SELECT id FROM \`users\` LIMIT 1`);
          const [rr] = await conn.execute(`SELECT id FROM \`reports\` LIMIT 1`);
          const testUserId2 = (ur as any)[0]?.id;
          const testRepId2 = (rr as any)[0]?.id;
          if (testUserId2 && testRepId2) {
            try {
              const saved = await saveExtractedBiomarkers(testUserId2, testRepId2, [
                { name: "__diag_test__", value: "1.23", unit: "mg/dL", status: "normal" },
              ]);
              const [cnt] = await conn.execute(`SELECT COUNT(*) as c FROM \`readings\` WHERE \`value\`='1.23'`);
              await conn.execute(`DELETE FROM \`readings\` WHERE \`value\`='1.23'`);
              await conn.execute(`DELETE FROM \`biomarkers\` WHERE \`name\`='__diag_test__'`);
              saveFnResult = `saved=${saved} dbConfirm=${(cnt as any)[0].c}`;
            } catch (e: any) {
              saveFnResult = `THREW: ${e.message}`;
            }
          } else {
            saveFnResult = `no user/report to test with`;
          }
        } catch (e: any) {
          saveFnResult = `import error: ${e.message}`;
        }

        return res.json({ ok: true, tables, testInsertResult, readingsCols, drizzleInsertResult, saveFnResult });
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
