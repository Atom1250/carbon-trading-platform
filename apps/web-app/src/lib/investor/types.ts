import type { ProjectCategory, ProjectStage } from "@/lib/types/personas";

export type InstrumentType = "SENIOR_SECURED_LOAN" | "SENIOR_UNSECURED_LOAN" | "MEZZANINE_LOAN" | "EQUITY" | "BLENDED";
export type PaymentFrequency = "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";

export type VerificationBadge =
  | "ADMIN_REVIEWED"
  | "KYC_COMPLETE"
  | "PPA_SIGNED"
  | "PERMITS_COMPLETE"
  | "INTERCONNECTION_SECURED"
  | "METHODOLOGY_SELECTED"
  | "REGISTRY_ID_PROVIDED";

export type AccessScope = "TEASER" | "FULL_DATAROOM" | "CARBON_ONLY";

export interface InvestorMandate {
  id: string;
  name: string;
  categories: ProjectCategory[];
  subtypes?: string[];
  countriesAllowed?: string[];
  countriesExcluded?: string[];
  stagesAllowed: ProjectStage[];
  ticketMin?: number;
  ticketMax?: number;
  currency?: string;
  instruments: InstrumentType[];
  tenorMinYears?: number;
  tenorMaxYears?: number;
  couponMinPct?: number;
  couponMaxPct?: number;
  dscrMin?: number;
  creditsRequired: boolean;
  minAnnualCreditsTco2e?: number;
  preferredStandards?: string[];
  vintagePrefs?: string[];
  weights: {
    match: number;
    readiness: number;
    return: number;
    impact: number;
    risk: number;
  };
}

export interface InvestorAccess {
  investorOrgId: string;
  projectId: string;
  ndaSigned: boolean;
  approved: boolean;
  scope: AccessScope;
  updatedAt: string;
}

export interface ProjectOfferingTerms {
  instrument: InstrumentType;
  askAmount: number;
  currency: string;
  tenorYears?: number;
  couponPct?: number;
  paymentFrequency?: PaymentFrequency;
  amortization?: "BULLET" | "STRAIGHT_LINE" | "SCULPTED";
  gracePeriodMonths?: number;
  proposedCovenants?: {
    dscrMin?: number;
    reserveMonths?: number;
  };
  carbonComponent: {
    enabled: boolean;
    deliveryType?: "IN_KIND_CREDITS" | "REVENUE_SHARE" | "OFFTAKE_OPTION";
    deliveryPriority?: "SENIOR" | "PARI_PASSU" | "JUNIOR";
    expectedAnnualCreditsTco2e?: number;
    issuanceSchedule?: Array<{ year: number; tco2e: number }>;
    standard?: string;
    methodology?: string;
    registry?: string;
    bufferPct?: number;
    leakagePct?: number;
    shortfallHandling?: "MAKE_GOOD" | "CASH_TRUE_UP" | "BEST_EFFORTS";
  };
}

export interface UnderwritingSnapshot {
  projectId: string;
  readinessScore: number;
  riskRating: "LOW" | "MEDIUM" | "HIGH";
  stage: ProjectStage;
  category: ProjectCategory;
  ppaStatus?: "NONE" | "LOI" | "TERM_SHEET" | "SIGNED";
  permitsStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
  interconnectionStatus?: "APPLIED" | "STUDY" | "AGREEMENT" | "SECURED";
  terms: ProjectOfferingTerms;
  badges: VerificationBadge[];
  updatedAt: string;
}

export interface InvestorProjectCardModel {
  projectId: string;
  name: string;
  country: string;
  region?: string;
  category: ProjectCategory;
  subtype?: string;
  stage: ProjectStage;
  readinessScore: number;
  riskRating: "LOW" | "MEDIUM" | "HIGH";
  terms: ProjectOfferingTerms;
  badges: VerificationBadge[];
}

export type QATemplateKey =
  | "DEBT_TERMS"
  | "CARBON_DELIVERY"
  | "PPA_INTERCONNECTION"
  | "PERMITS"
  | "OWNERSHIP_GOVERNANCE"
  | "MRV_METHOD"
  | "RISKS_MITIGATION";

export interface QAItem {
  id: string;
  projectId: string;
  templateKey?: QATemplateKey;
  question: string;
  askedBy: { investorOrgId: string; userId: string; name: string };
  askedAt: string;
  status: "OPEN" | "ANSWERED" | "NEEDS_FOLLOWUP" | "CLOSED";
  answer?: {
    text: string;
    answeredBy: { projectOwnerId: string; name: string };
    answeredAt: string;
    attachments?: Array<{ id: string; filename: string }>;
  };
  tags?: string[];
  icRelevance?: "LOW" | "MEDIUM" | "HIGH";
}

export interface QAThread {
  projectId: string;
  items: QAItem[];
}
