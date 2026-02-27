import type { AdminKpis, AdminTask, DisputeCase, DocumentIssue, RiskItem, RiskTrendPoint, SlaBreach, SlaMetric } from "@/lib/admin/types";
import { getSettlementTimeline, getTrade, listRfqs, listTrades } from "@/lib/trading/api";
import { listOnboardingCases } from "@/lib/onboarding/api";

const now = Date.now();

let tasks: AdminTask[] = [
  {
    id: "task_001",
    objectType: "ONBOARDING",
    objectId: "kyc_inst_001",
    title: "Review ownership blocker",
    priority: "CRITICAL",
    riskScore: 88,
    slaDeadline: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    assignedAdmin: "admin_01",
    status: "BLOCKED",
    escalationFlag: true,
  },
  {
    id: "task_002",
    objectType: "TRADE",
    objectId: "trd_001",
    title: "Confirm transfer milestone evidence",
    priority: "HIGH",
    riskScore: 75,
    slaDeadline: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
    assignedAdmin: "admin_02",
    status: "IN_PROGRESS",
  },
  {
    id: "task_003",
    objectType: "RFQ",
    objectId: "rfq_001",
    title: "Monitor overdue quote response",
    priority: "MEDIUM",
    riskScore: 52,
    slaDeadline: new Date(now + 18 * 60 * 60 * 1000).toISOString(),
    status: "OPEN",
  },
  {
    id: "task_004",
    objectType: "PROJECT",
    objectId: "p_002",
    title: "Validate biodiversity methodology claim",
    priority: "HIGH",
    riskScore: 79,
    slaDeadline: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    status: "OPEN",
    escalationFlag: true,
  },
];

const riskTrend: RiskTrendPoint[] = [
  { date: "2026-02-20", avgRiskScore: 58 },
  { date: "2026-02-21", avgRiskScore: 61 },
  { date: "2026-02-22", avgRiskScore: 59 },
  { date: "2026-02-23", avgRiskScore: 64 },
  { date: "2026-02-24", avgRiskScore: 66 },
  { date: "2026-02-25", avgRiskScore: 62 },
  { date: "2026-02-26", avgRiskScore: 60 },
];

const documentIssues: DocumentIssue[] = [
  {
    id: "doc_issue_001",
    objectType: "ONBOARDING",
    objectId: "kyc_inst_001",
    issueType: "EXPIRING",
    documentName: "Director ID - Alex Morgan",
    dueAt: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
    version: 2,
  },
  {
    id: "doc_issue_002",
    objectType: "PROJECT",
    objectId: "p_002",
    issueType: "MISSING_CRITICAL",
    documentName: "Ownership chart",
    version: 1,
  },
  {
    id: "doc_issue_003",
    objectType: "TRADE",
    objectId: "trd_001",
    issueType: "UNVERIFIED_CLAIM",
    documentName: "Transfer confirmation PDF",
    version: 4,
  },
];

const disputes: DisputeCase[] = [
  {
    id: "dsp_001",
    tradeId: "trd_001",
    disputeReason: "Counterparty claims registry transfer delay beyond agreed settlement window.",
    evidence: ["bank-confirmation.pdf", "registry-email-thread.pdf"],
    resolutionStatus: "UNDER_REVIEW",
    escalationNotes: "Escalated to operations lead due to SLA breach risk.",
  },
];

function overdueHours(dueAt: string) {
  return Math.max(0, Math.round((Date.now() - new Date(dueAt).getTime()) / (1000 * 60 * 60)));
}

export async function listAdminTasks() {
  return tasks;
}

export async function bulkAssignTasks(taskIds: string[], admin: string) {
  tasks = tasks.map((t) => (taskIds.includes(t.id) ? { ...t, assignedAdmin: admin } : t));
  return tasks;
}

export async function updateTask(taskId: string, patch: Partial<Pick<AdminTask, "status" | "escalationFlag" | "assignedAdmin">>) {
  tasks = tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
  return tasks.find((t) => t.id === taskId) ?? null;
}

export async function getAdminDashboardData() {
  const [onboarding, trades] = await Promise.all([listOnboardingCases(), listTrades()]);
  const blockedSettlements = trades.filter((t) => t.status === "SETTLEMENT_IN_PROGRESS").length;
  const slaBreaches = tasks.filter((t) => overdueHours(t.slaDeadline) > 0).length;

  const kpis: AdminKpis = {
    openTasks: tasks.filter((t) => t.status !== "COMPLETE").length,
    criticalTasks: tasks.filter((t) => t.priority === "CRITICAL" && t.status !== "COMPLETE").length,
    highRiskCases: onboarding.filter((c) => c.riskRating === "HIGH").length + trades.filter((t) => t.status !== "SETTLED").length,
    blockedSettlements,
    slaBreaches,
  };

  const highPriorityTasks = tasks
    .filter((t) => t.priority === "CRITICAL" || t.priority === "HIGH")
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 6);

  const riskAlerts = tasks.filter((t) => t.riskScore >= 75).slice(0, 8);
  const settlementBlockages = tasks.filter((t) => t.objectType === "TRADE" && t.status === "BLOCKED");
  const breaches = tasks.filter((t) => overdueHours(t.slaDeadline) > 0);

  return { kpis, highPriorityTasks, riskAlerts, settlementBlockages, breaches };
}

export async function getRiskDashboardData() {
  const [onboarding, trades] = await Promise.all([listOnboardingCases(), listTrades()]);
  const highRiskOnboarding: RiskItem[] = onboarding
    .filter((c) => c.riskRating === "HIGH" || c.riskRating === "MEDIUM")
    .map((c) => ({ id: c.id, type: "ONBOARDING", name: c.kind === "INSTITUTION" ? c.institution.legalName : c.person.fullName, riskScore: c.riskRating === "HIGH" ? 85 : 65, reason: c.fieldIssues.length ? c.fieldIssues[0].message : "Screening pending", updatedAt: c.updatedAt }));

  const highRiskTrades: RiskItem[] = trades
    .filter((t) => t.status !== "SETTLED")
    .map((t) => ({ id: t.id, type: "TRADE", name: `Trade ${t.id}`, riskScore: t.status === "SETTLEMENT_IN_PROGRESS" ? 78 : 55, reason: t.status === "SETTLEMENT_IN_PROGRESS" ? "Settlement in progress" : "Awaiting confirmation", updatedAt: t.updatedAt }));

  const highRiskProjects: RiskItem[] = [
    { id: "p_002", type: "PROJECT", name: "Coastal Mangrove Restoration", riskScore: 81, reason: "Early-stage permits and methodology uncertainty", updatedAt: new Date().toISOString() },
  ];

  return { highRiskOnboarding, highRiskTrades, highRiskProjects, riskTrend };
}

export async function getSlaData() {
  const rfqs = await listRfqs();
  const trades = await listTrades();

  const metrics: SlaMetric[] = [
    { name: "Avg KYC review time", avgHours: 36, targetHours: 48 },
    { name: "Avg trade settlement cycle", avgHours: 28, targetHours: 24 },
    { name: "RFQ response time", avgHours: rfqs.length ? 9 : 0, targetHours: 8 },
    { name: "Q&A response time", avgHours: 7, targetHours: 12 },
  ];

  const breaches: SlaBreach[] = tasks
    .filter((t) => overdueHours(t.slaDeadline) > 0)
    .map((t) => ({
      id: `breach_${t.id}`,
      objectType: t.objectType,
      objectId: t.objectId,
      owner: t.assignedAdmin ?? "Unassigned",
      dueAt: t.slaDeadline,
      overdueHours: overdueHours(t.slaDeadline),
    }));

  if (trades.some((t) => t.status === "SETTLEMENT_IN_PROGRESS")) {
    breaches.push({
      id: "breach_trade_settlement",
      objectType: "TRADE",
      objectId: trades.find((t) => t.status === "SETTLEMENT_IN_PROGRESS")?.id ?? "-",
      owner: "Ops Desk",
      dueAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      overdueHours: 3,
    });
  }

  return { metrics, breaches };
}

export async function getDocumentIssues() {
  return documentIssues;
}

export async function getDisputes() {
  return disputes;
}

export async function getAdminTradeOversight(tradeId: string) {
  const trade = await getTrade(tradeId);
  if (!trade) return null;
  const timeline = await getSettlementTimeline(tradeId);
  const blockage = timeline.find((m) => m.status === "BLOCKED") ?? null;
  const pending = timeline.filter((m) => m.status === "PENDING").length;

  return {
    trade,
    timeline,
    blockage,
    pending,
    counterpartyResponsibility:
      blockage?.type?.startsWith("TRANSFER") ? "SELLER" : blockage?.type?.startsWith("CASH") ? "BUYER" : "SHARED",
  };
}
