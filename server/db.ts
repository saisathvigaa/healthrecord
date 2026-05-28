import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, InsertReport, InsertBiomarker, InsertReading, users, reports, biomarkers, readings } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Run startup DB migrations using raw mysql2.
 * Creates any missing tables (biomarkers, reports, readings) and columns (passwordHash).
 * Safe to call on every startup — uses CREATE TABLE IF NOT EXISTS.
 */
export async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[Migration] Skipping: DATABASE_URL not set");
    return;
  }

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(databaseUrl);
    console.log("[Migration] Running startup migrations...");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`biomarkers\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`unit\` varchar(50) NOT NULL DEFAULT '',
        \`referenceMin\` varchar(50),
        \`referenceMax\` varchar(50),
        \`referenceText\` text,
        \`description\` text,
        \`category\` varchar(50) NOT NULL DEFAULT 'general',
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`biomarkers_name_unique\` (\`name\`)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`reports\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`fileName\` varchar(255) NOT NULL,
        \`fileKey\` varchar(512) NOT NULL,
        \`fileUrl\` text,
        \`reportType\` enum('blood','urine','other') NOT NULL DEFAULT 'blood',
        \`uploadedAt\` timestamp NOT NULL DEFAULT (now()),
        \`extractedAt\` timestamp,
        \`extractionStatus\` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
        \`rawExtractedData\` text,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        PRIMARY KEY (\`id\`)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`readings\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`reportId\` int NOT NULL,
        \`biomarkerId\` int NOT NULL,
        \`value\` varchar(100) NOT NULL,
        \`status\` enum('normal','warning','abnormal','unknown') NOT NULL DEFAULT 'unknown',
        \`readingDate\` timestamp,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        PRIMARY KEY (\`id\`)
      )
    `);

    // Add passwordHash column to users if not already present (MySQL 8.0+)
    try {
      await connection.execute(
        `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`passwordHash\` varchar(255)`
      );
    } catch {
      // Ignore: column already exists or ALTER not supported — not critical
    }

    console.log("[Migration] All tables created/verified successfully");
  } catch (error) {
    console.error("[Migration] Startup migration failed:", error);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const nullableFields = ["name", "email", "loginMethod", "passwordHash"] as const;
    for (const field of nullableFields) {
      const value = user[field];
      if (value === undefined) continue;
      const normalized = value ?? null;
      (values as any)[field] = normalized;
      updateSet[field] = normalized;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Reports
export async function createReport(data: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reports).values(data);
  return (result as any).insertId;
}

export async function getUserReports(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.uploadedAt)) as any;
}

export async function getReportById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateReportStatus(id: number, status: "pending" | "processing" | "completed" | "failed", extractedData?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { extractionStatus: status };
  if (extractedData) {
    updateData.rawExtractedData = extractedData;
    updateData.extractedAt = new Date();
  }
  await db.update(reports).set(updateData).where(eq(reports.id, id));
}

export async function deleteReport(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reports).where(eq(reports.id, id));
}

// Biomarkers
export async function getBiomarkers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(biomarkers).orderBy(biomarkers.name);
}

export async function getBiomarkerByName(name: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(biomarkers).where(eq(biomarkers.name, name)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createBiomarker(data: InsertBiomarker) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(biomarkers).values(data);
  return (result as any).insertId;
}

// Readings
export async function createReading(data: InsertReading) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(readings).values(data);
  return (result as any).insertId;
}

export async function getUserReadings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Join with biomarkers to include name and unit in the result
  return db
    .select({
      id: readings.id,
      userId: readings.userId,
      reportId: readings.reportId,
      biomarkerId: readings.biomarkerId,
      value: readings.value,
      status: readings.status,
      readingDate: readings.readingDate,
      createdAt: readings.createdAt,
      biomarkerName: biomarkers.name,
      unit: biomarkers.unit,
    })
    .from(readings)
    .leftJoin(biomarkers, eq(readings.biomarkerId, biomarkers.id))
    .where(eq(readings.userId, userId))
    .orderBy(desc(readings.readingDate));
}

export async function getReadingsByBiomarker(userId: number, biomarkerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select().from(readings)
    .where(and(eq(readings.userId, userId), eq(readings.biomarkerId, biomarkerId)))
    .orderBy(desc(readings.readingDate));
}

export async function deleteReadingsByReport(reportId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(readings).where(eq(readings.reportId, reportId));
}
