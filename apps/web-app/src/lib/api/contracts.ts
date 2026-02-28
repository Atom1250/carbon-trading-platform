import { z } from "zod";

export const DashboardRecentItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  meta: z.string().min(1),
});

export const DashboardWorkItemSchema = z.object({
  title: z.string().min(1),
  meta: z.string().min(1),
  severity: z.enum(["BLOCKER", "URGENT", "WARNING"]),
});

export const DashboardHealthMetricSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
});

export const DashboardSnapshotSchema = z.object({
  recent: z.array(DashboardRecentItemSchema),
  workQueue: z.array(DashboardWorkItemSchema),
  health: z.array(DashboardHealthMetricSchema),
});

export const TradingMarketplaceSnapshotSchema = z.object({
  kpis: z.object({
    listings: z.number().int().nonnegative(),
    removals: z.number().int().nonnegative(),
    avoidance: z.number().int().nonnegative(),
    avgIndicativePrice: z.number().nonnegative(),
  }),
});

export const AdminDashboardSnapshotSchema = z.object({
  kpis: z.object({
    openTasks: z.number().int().nonnegative(),
    criticalTasks: z.number().int().nonnegative(),
    highRiskCases: z.number().int().nonnegative(),
    blockedSettlements: z.number().int().nonnegative(),
    slaBreaches: z.number().int().nonnegative(),
  }),
});

export type DashboardSnapshot = z.infer<typeof DashboardSnapshotSchema>;
export type TradingMarketplaceSnapshot = z.infer<typeof TradingMarketplaceSnapshotSchema>;
export type AdminDashboardSnapshot = z.infer<typeof AdminDashboardSnapshotSchema>;
