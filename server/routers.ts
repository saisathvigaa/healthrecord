import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

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
