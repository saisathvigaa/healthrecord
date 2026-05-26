import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Health reports uploaded by users (PDF/images)
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // S3 storage key
  fileUrl: text("fileUrl"), // /manus-storage/ URL
  reportType: mysqlEnum("reportType", ["blood", "urine", "other"]).default("blood").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  extractedAt: timestamp("extractedAt"),
  extractionStatus: mysqlEnum("extractionStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  rawExtractedData: text("rawExtractedData"), // JSON string of extracted values
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Biomarker definitions (Hemoglobin, Glucose, Creatinine, etc.)
 */
export const biomarkers = mysqlTable("biomarkers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(), // e.g., "Hemoglobin"
  unit: varchar("unit", { length: 50 }).notNull(), // e.g., "g/dL"
  referenceMin: varchar("referenceMin", { length: 50 }), // e.g., "13"
  referenceMax: varchar("referenceMax", { length: 50 }), // e.g., "17"
  referenceText: text("referenceText"), // e.g., "13 — 17 g/dL"
  description: text("description"), // What this biomarker means
  category: varchar("category", { length: 50 }).default("general").notNull(), // blood, urine, metabolic, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Biomarker = typeof biomarkers.$inferSelect;
export type InsertBiomarker = typeof biomarkers.$inferInsert;

/**
 * Individual biomarker readings from reports
 */
export const readings = mysqlTable("readings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reportId: int("reportId").notNull(),
  biomarkerId: int("biomarkerId").notNull(),
  value: varchar("value", { length: 100 }).notNull(), // Actual measured value
  status: mysqlEnum("status", ["normal", "warning", "abnormal", "unknown"]).default("unknown").notNull(),
  readingDate: timestamp("readingDate"), // Date of the test (from report)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Reading = typeof readings.$inferSelect;
export type InsertReading = typeof readings.$inferInsert;

// TODO: Add your tables here
