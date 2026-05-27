import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique identifier: "email:<email>" for password users, "google:<sub>" for Google users */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  /** scrypt hash for email+password users; null for OAuth-only users */
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: text("fileUrl"),
  reportType: mysqlEnum("reportType", ["blood", "urine", "other"]).default("blood").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  extractedAt: timestamp("extractedAt"),
  extractionStatus: mysqlEnum("extractionStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  rawExtractedData: text("rawExtractedData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

export const biomarkers = mysqlTable("biomarkers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  unit: varchar("unit", { length: 50 }).notNull(),
  referenceMin: varchar("referenceMin", { length: 50 }),
  referenceMax: varchar("referenceMax", { length: 50 }),
  referenceText: text("referenceText"),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Biomarker = typeof biomarkers.$inferSelect;
export type InsertBiomarker = typeof biomarkers.$inferInsert;

export const readings = mysqlTable("readings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reportId: int("reportId").notNull(),
  biomarkerId: int("biomarkerId").notNull(),
  value: varchar("value", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["normal", "warning", "abnormal", "unknown"]).default("unknown").notNull(),
  readingDate: timestamp("readingDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Reading = typeof readings.$inferSelect;
export type InsertReading = typeof readings.$inferInsert;
