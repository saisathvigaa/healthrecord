import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { extractBiomarkersFromReport, saveExtractedBiomarkers } from "./extraction";
import { extractBiomarkersWithGemini } from "./_core/gemini";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Health Records
  reports: router({
    list: protectedProcedure.query(({ ctx }) =>
      db.getUserReports(ctx.user.id)
    ),
    create: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileKey: z.string(),
        fileUrl: z.string(),
        reportType: z.enum(["blood", "urine", "other"]).default("blood"),
      }))
      .mutation(({ ctx, input }) =>
        db.createReport({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileKey: input.fileKey,
          fileUrl: input.fileUrl,
          reportType: input.reportType,
          extractionStatus: "pending",
        })
      ),
    extract: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        fileUrl: z.string(),
        reportType: z.enum(["blood", "urine", "other"]),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          await db.updateReportStatus(input.reportId, "processing");
          const extractionResult = await extractBiomarkersFromReport(
            input.fileUrl,
            input.reportType
          );
          if (!extractionResult.success) {
            await db.updateReportStatus(input.reportId, "failed", extractionResult.error);
            return {
              success: false,
              error: extractionResult.error,
              biomarkers: [],
            };
          }
          const createdReadings = await saveExtractedBiomarkers(
            ctx.user.id,
            input.reportId,
            extractionResult.biomarkers
          );
          await db.updateReportStatus(
            input.reportId,
            "completed",
            JSON.stringify(extractionResult.biomarkers)
          );
          return {
            success: true,
            biomarkers: extractionResult.biomarkers,
            createdReadings,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          await db.updateReportStatus(input.reportId, "failed", errorMessage);
          return {
            success: false,
            error: errorMessage,
            biomarkers: [],
          };
        }
      }),
    // Extract biomarkers from a base64-encoded file (PDF or image) using Gemini
    extractFromBase64: protectedProcedure
      .input(z.object({
        base64Data: z.string(),
        mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
        fileName: z.string(),
        reportType: z.enum(["blood", "urine", "other"]).default("blood"),
      }))
      .mutation(async ({ ctx, input }) => {
        const reportId = await db.createReport({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileKey: `upload/${Date.now()}-${input.fileName}`,
          fileUrl: "",
          reportType: input.reportType,
          extractionStatus: "processing",
        });
        try {
          const biomarkers = await extractBiomarkersWithGemini(input.base64Data, input.mimeType);
          const createdReadings = await saveExtractedBiomarkers(ctx.user.id, reportId as number, biomarkers);
          await db.updateReportStatus(reportId as number, "completed", JSON.stringify(biomarkers));
          if (createdReadings === 0 && biomarkers.length > 0) {
            console.error(`[Router] extractFromBase64: extracted ${biomarkers.length} biomarkers but saved 0 readings — possible DB table missing`);
            throw new Error(`Extracted ${biomarkers.length} biomarkers but failed to save any to the database. Check server logs for details.`);
          }
          return { success: true, biomarkers, createdReadings };
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Extraction failed";
          await db.updateReportStatus(reportId as number, "failed", msg);
          return { success: false, error: msg, biomarkers: [] };
        }
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        status: z.enum(["pending", "processing", "completed", "failed"]),
        extractedData: z.string().optional(),
      }))
      .mutation(({ input }) =>
        db.updateReportStatus(input.reportId, input.status, input.extractedData)
      ),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteReadingsByReport(input.id);
        await db.deleteReport(input.id);
      }),
  }),

  biomarkers: router({
    list: publicProcedure.query(() => db.getBiomarkers()),
    getReadings: protectedProcedure
      .input(z.object({
        timeRange: z.enum(['3m', '6m', '1y', 'all']).default('6m'),
      }))
      .query(async ({ ctx, input }) => {
        const allReadings = await db.getUserReadings(ctx.user.id);
        const now = new Date();
        let startDate = new Date();
        
        switch (input.timeRange) {
          case '3m':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case '6m':
            startDate.setMonth(startDate.getMonth() - 6);
            break;
          case '1y':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case 'all':
            startDate = new Date(0);
            break;
        }
        
        return allReadings.filter((r: any) => new Date(r.readingDate) >= startDate);
      }),
  }),

  readings: router({
    list: protectedProcedure.query(({ ctx }) =>
      db.getUserReadings(ctx.user.id)
    ),
    byBiomarker: protectedProcedure
      .input(z.object({ biomarkerId: z.number() }))
      .query(({ ctx, input }) =>
        db.getReadingsByBiomarker(ctx.user.id, input.biomarkerId)
      ),
    create: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        biomarkerId: z.number(),
        value: z.string(),
        status: z.enum(["normal", "warning", "abnormal", "unknown"]),
        readingDate: z.date().optional(),
      }))
      .mutation(({ ctx, input }) =>
        db.createReading({
          userId: ctx.user.id,
          reportId: input.reportId,
          biomarkerId: input.biomarkerId,
          value: input.value,
          status: input.status,
          readingDate: input.readingDate,
        })
      ),
  }),
});

export type AppRouter = typeof appRouter;
