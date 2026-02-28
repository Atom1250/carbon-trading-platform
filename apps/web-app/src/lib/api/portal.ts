import type { CurrentUser } from "@/lib/user/types";
import { listOwnerProjects } from "@/lib/api/client";
import { listCatalog } from "@/lib/investor/api";
import { listOnboardingCases } from "@/lib/onboarding/api";
import { getAdminDashboardData, listAdminTasks } from "@/lib/admin/api";
import { listListings, listRfqs, listTrades } from "@/lib/trading/api";
import {
  AdminDashboardSnapshotSchema,
  DashboardSnapshotSchema,
  TradingMarketplaceSnapshotSchema,
  type AdminDashboardSnapshot,
  type DashboardSnapshot,
  type TradingMarketplaceSnapshot,
} from "@/lib/api/contracts";

export async function getDashboardSnapshot(user: CurrentUser): Promise<DashboardSnapshot> {
  const [projects, catalog, onboarding, trades, rfqs, tasks, admin] = await Promise.all([
    listOwnerProjects(),
    listCatalog(),
    listOnboardingCases(),
    listTrades(),
    listRfqs(),
    listAdminTasks(),
    user.entitlements.adminPortal ? getAdminDashboardData() : Promise.resolve(null),
  ]);

  const readinessReady = projects.filter((p) => (p.readinessScore ?? 0) >= 60).length;
  const settlementInProgress = trades.filter((t) => t.status === "SETTLEMENT_IN_PROGRESS").length;
  const actionableCases = onboarding.filter((c) => c.status === "ACTION_REQUIRED").length;

  const snapshot = {
    recent: [
      { label: "Sunridge Solar SPV - Underwrite", href: "/investor/projects/p_001/underwrite", meta: "Viewed 2h ago" },
      { label: "RFQ-001 - Quote Inbox", href: "/trading/rfq/rfq_001", meta: "Viewed yesterday" },
      { label: "Onboarding - Institutional status", href: "/onboarding/institution/kyc_inst_001/status", meta: "Updated 1d ago" },
    ],
    workQueue: [
      { title: "Onboarding: resolve ownership blocker", meta: `Action required cases: ${actionableCases}`, severity: "BLOCKER" as const },
      {
        title: "Trading: follow up settlement evidence",
        meta: `${settlementInProgress} trades currently settling`,
        severity: "URGENT" as const,
      },
      {
        title: "Investment: review new opportunities",
        meta: `${catalog.length} projects currently available in catalog`,
        severity: "WARNING" as const,
      },
    ],
    health: [
      { key: "projectsReady", label: "Projects investor-ready", value: String(readinessReady) },
      { key: "rfqsOpen", label: "Open RFQs", value: String(rfqs.length) },
      { key: "tradesSettling", label: "Trades settling", value: String(settlementInProgress) },
      {
        key: "slaBreaches",
        label: "SLA breaches",
        value: user.entitlements.adminPortal ? String(admin?.kpis.slaBreaches ?? 0) : "—",
      },
    ],
  };

  return DashboardSnapshotSchema.parse(snapshot);
}

export async function getTradingMarketplaceSnapshot(): Promise<TradingMarketplaceSnapshot> {
  const listings = await listListings();
  const removals = listings.filter((l) => l.category === "REMOVAL").length;
  const avoidance = listings.filter((l) => l.category === "AVOIDANCE").length;
  const avgIndicativePrice =
    listings.length === 0
      ? 0
      : Number((listings.reduce((acc, l) => acc + l.indicativePricing.mid, 0) / listings.length).toFixed(2));

  return TradingMarketplaceSnapshotSchema.parse({
    kpis: {
      listings: listings.length,
      removals,
      avoidance,
      avgIndicativePrice,
    },
  });
}

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  const data = await getAdminDashboardData();
  return AdminDashboardSnapshotSchema.parse({ kpis: data.kpis });
}
