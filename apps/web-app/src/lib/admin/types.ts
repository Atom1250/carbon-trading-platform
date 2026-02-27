export type AdminTaskType = "ONBOARDING" | "PROJECT" | "RFQ" | "TRADE";
export type AdminTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AdminTaskStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "COMPLETE";

export interface AdminTask {
  id: string;
  objectType: AdminTaskType;
  objectId: string;
  title: string;
  priority: AdminTaskPriority;
  riskScore: number;
  slaDeadline: string;
  assignedAdmin?: string;
  status: AdminTaskStatus;
  escalationFlag?: boolean;
}

export interface AdminKpis {
  openTasks: number;
  criticalTasks: number;
  highRiskCases: number;
  blockedSettlements: number;
  slaBreaches: number;
}

export interface SlaMetric {
  name: string;
  avgHours: number;
  targetHours: number;
}

export interface SlaBreach {
  id: string;
  objectType: AdminTaskType;
  objectId: string;
  owner: string;
  dueAt: string;
  overdueHours: number;
}

export interface RiskItem {
  id: string;
  type: AdminTaskType | "PROJECT";
  name: string;
  riskScore: number;
  reason: string;
  updatedAt: string;
}

export interface RiskTrendPoint {
  date: string;
  avgRiskScore: number;
}

export interface DocumentIssue {
  id: string;
  objectType: AdminTaskType | "PROJECT";
  objectId: string;
  issueType: "EXPIRING" | "MISSING_CRITICAL" | "UNVERIFIED_CLAIM";
  documentName: string;
  dueAt?: string;
  version: number;
}

export interface DisputeCase {
  id: string;
  tradeId: string;
  disputeReason: string;
  evidence: string[];
  resolutionStatus: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "ESCALATED";
  escalationNotes?: string;
}
