import type {
  InvestorMandate,
  InvestorProjectCardModel,
  UnderwritingSnapshot,
  QAThread,
  QAItem,
  QATemplateKey,
} from "@/lib/investor/types";

function nowIso() {
  return new Date().toISOString();
}

let mandate: InvestorMandate = {
  id: "mand_001",
  name: "Default Mandate",
  categories: ["RENEWABLE_ENERGY", "BIODIVERSITY"],
  stagesAllowed: ["FEASIBILITY", "PERMITTED", "READY_TO_BUILD", "CONSTRUCTION", "OPERATING"],
  instruments: ["SENIOR_SECURED_LOAN", "BLENDED"],
  creditsRequired: false,
  weights: { match: 0.35, readiness: 0.25, return: 0.2, impact: 0.1, risk: 0.1 },
};

const catalog: InvestorProjectCardModel[] = [
  {
    projectId: "p_001",
    name: "Sunridge Solar SPV",
    country: "Portugal",
    region: "Alentejo",
    category: "RENEWABLE_ENERGY",
    subtype: "Solar",
    stage: "FEASIBILITY",
    readinessScore: 62,
    riskRating: "MEDIUM",
    terms: {
      instrument: "SENIOR_SECURED_LOAN",
      askAmount: 25000000,
      currency: "EUR",
      tenorYears: 8,
      couponPct: 7.5,
      paymentFrequency: "QUARTERLY",
      amortization: "SCULPTED",
      proposedCovenants: { dscrMin: 1.2, reserveMonths: 6 },
      carbonComponent: {
        enabled: true,
        deliveryType: "IN_KIND_CREDITS",
        deliveryPriority: "PARI_PASSU",
        expectedAnnualCreditsTco2e: 42000,
        issuanceSchedule: [
          { year: 2027, tco2e: 38000 },
          { year: 2028, tco2e: 42000 },
        ],
        standard: "VERRA",
        methodology: "TBD",
        registry: "TBD",
        bufferPct: 10,
        shortfallHandling: "CASH_TRUE_UP",
      },
    },
    badges: ["METHODOLOGY_SELECTED"],
  },
  {
    projectId: "p_002",
    name: "Coastal Mangrove Restoration",
    country: "Mozambique",
    region: "Sofala",
    category: "BIODIVERSITY",
    subtype: "Blue Carbon",
    stage: "CONCEPT",
    readinessScore: 28,
    riskRating: "HIGH",
    terms: {
      instrument: "BLENDED",
      askAmount: 6000000,
      currency: "USD",
      tenorYears: 10,
      couponPct: 4.0,
      paymentFrequency: "SEMI_ANNUAL",
      amortization: "BULLET",
      carbonComponent: {
        enabled: true,
        deliveryType: "REVENUE_SHARE",
        expectedAnnualCreditsTco2e: 180000,
        issuanceSchedule: [
          { year: 2028, tco2e: 140000 },
          { year: 2029, tco2e: 180000 },
        ],
        standard: "VERRA",
        methodology: "ARR/BlueCarbon (TBD)",
        registry: "TBD",
        bufferPct: 20,
        leakagePct: 5,
        shortfallHandling: "BEST_EFFORTS",
      },
    },
    badges: [],
  },
];

const underwriting: Record<string, UnderwritingSnapshot> = {
  p_001: {
    projectId: "p_001",
    readinessScore: 62,
    riskRating: "MEDIUM",
    stage: "FEASIBILITY",
    category: "RENEWABLE_ENERGY",
    ppaStatus: "TERM_SHEET",
    permitsStatus: "IN_PROGRESS",
    interconnectionStatus: "STUDY",
    terms: catalog[0].terms,
    badges: catalog[0].badges,
    updatedAt: nowIso(),
  },
  p_002: {
    projectId: "p_002",
    readinessScore: 28,
    riskRating: "HIGH",
    stage: "CONCEPT",
    category: "BIODIVERSITY",
    terms: catalog[1].terms,
    badges: catalog[1].badges,
    updatedAt: nowIso(),
  },
};

const templates: Record<QATemplateKey, string[]> = {
  DEBT_TERMS: [
    "Please confirm proposed seniority, security package, and any collateral/pledges.",
    "Provide draft term sheet (coupon, tenor, fees, covenants, CPs).",
    "What are repayment sources and DSCR assumptions?",
  ],
  CARBON_DELIVERY: [
    "Are credits delivered in-kind, revenue share, or offtake option? Please specify waterfall.",
    "Provide issuance schedule by vintage and shortfall make-good mechanics.",
    "Confirm standard/methodology/registry and verification timeline assumptions.",
  ],
  PPA_INTERCONNECTION: [
    "What is the current PPA status and key terms (tenor, price, curtailment)?",
    "Interconnection status: queue position, upgrade costs, expected COD?",
  ],
  PERMITS: [
    "Please provide permits matrix with statuses and expected dates.",
    "Any known constraints or community objections?",
  ],
  OWNERSHIP_GOVERNANCE: [
    "Please provide sponsor track record and SPV governance details.",
    "Who are authorized signatories and what approvals are needed to close financing?",
  ],
  MRV_METHOD: [
    "Provide MRV plan and baseline assumptions.",
    "How will double counting be prevented (RECs, host authorization, claims policy)?",
  ],
  RISKS_MITIGATION: [
    "Top 10 risks and mitigations, including construction schedule and performance guarantees.",
    "Provide insurance package and contingency approach.",
  ],
};

const qa: Record<string, QAThread> = {
  p_001: {
    projectId: "p_001",
    items: [
      {
        id: "qa_001",
        projectId: "p_001",
        templateKey: "PPA_INTERCONNECTION",
        question: "Interconnection status: queue position, upgrade costs, and expected COD?",
        askedBy: { investorOrgId: "inv_org_01", userId: "u_01", name: "Investor Analyst" },
        askedAt: nowIso(),
        status: "ANSWERED",
        answer: {
          text: "Queue position 14. Upgrade estimate EUR 1.8m. Expected COD Q2 2027 subject to permit close-out.",
          answeredBy: { projectOwnerId: "own_01", name: "Project Owner Rep" },
          answeredAt: nowIso(),
          attachments: [{ id: "att_01", filename: "grid-study-summary.pdf" }],
        },
        icRelevance: "HIGH",
        tags: ["GRID", "SCHEDULE"],
      },
    ],
  },
};

export async function getInvestorMandate(): Promise<InvestorMandate> {
  return mandate;
}

export async function saveInvestorMandate(next: InvestorMandate): Promise<void> {
  mandate = next;
}

export async function listCatalog(): Promise<InvestorProjectCardModel[]> {
  return catalog;
}

export async function getUnderwriting(projectId: string): Promise<UnderwritingSnapshot | null> {
  return underwriting[projectId] ?? null;
}

export async function getQaThread(projectId: string): Promise<QAThread> {
  return qa[projectId] ?? { projectId, items: [] };
}

export async function askQuestion(projectId: string, question: string, templateKey?: QATemplateKey): Promise<QAItem> {
  const item: QAItem = {
    id: `qa_${Math.random().toString(16).slice(2)}`,
    projectId,
    templateKey,
    question,
    askedBy: { investorOrgId: "inv_org_01", userId: "u_01", name: "Investor Analyst" },
    askedAt: nowIso(),
    status: "OPEN",
    icRelevance: "MEDIUM",
  };

  qa[projectId] = qa[projectId] ?? { projectId, items: [] };
  qa[projectId].items.unshift(item);
  return item;
}

export async function getQuestionTemplates(): Promise<typeof templates> {
  return templates;
}
