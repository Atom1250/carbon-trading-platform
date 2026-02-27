import type {
  OnboardingCase,
  OnboardingInstitutionCase,
  OnboardingPersonCase,
  CaseStatus,
  DocumentType,
  DocStatus,
  RiskRating,
} from "@/lib/onboarding/types";

function nowIso() {
  return new Date().toISOString();
}

const mockInstitutionCase: OnboardingInstitutionCase = {
  id: "kyc_inst_001",
  kind: "INSTITUTION",
  status: "ACTION_REQUIRED",
  riskRating: "MEDIUM",
  createdAt: nowIso(),
  updatedAt: nowIso(),
  ndaRequired: true,
  institution: {
    legalName: "Example Capital Partners Ltd.",
    registrationNumber: "REG-123456",
    countryOfIncorporation: "United Kingdom",
    registeredAddress: "10 Example Street, London, UK",
    regulated: true,
    regulatorName: "FCA",
    licenseNumber: "FCA-000000",
  },
  business: {
    industry: "Asset Management",
    purposeOfRelationship: "Invest in renewable energy projects and participate in carbon credit offtake.",
    expectedProducts: ["PROJECT_FUNDING", "CARBON_OFFTAKE"],
    expectedAnnualVolume: 20000000,
    expectedTicketSize: 2500000,
    operatingCountries: ["United Kingdom", "Portugal"],
    sourceOfFunds: "Client capital and management fees.",
  },
  people: [
    {
      id: "per_001",
      profile: {
        fullName: "Alex Morgan",
        dateOfBirth: "1982-02-10",
        nationality: ["United Kingdom"],
        residentialAddress: "22 Sample Road, London, UK",
        email: "alex.morgan@example.com",
        roles: ["DIRECTOR", "SIGNATORY"],
        pepDeclared: false,
        id: { type: "PASSPORT", number: "123456789", issuingCountry: "United Kingdom", expiry: "2030-05-01" },
      },
    },
  ],
  entities: [],
  ownership: [],
  documents: [
    { id: "doc_001", type: "REGISTRY_EXCERPT", filename: "registry-excerpt.pdf", uploadedAt: nowIso(), status: "ACCEPTED" },
    {
      id: "doc_002",
      type: "OWNERSHIP_CHART",
      filename: "ownership-chart.pdf",
      uploadedAt: nowIso(),
      status: "REJECTED",
      reviewerComment: "Needs showing UBO chain to natural persons.",
    },
  ],
  documentRequests: [
    {
      id: "req_001",
      type: "OWNERSHIP_CHART",
      reason: "Provide updated ownership chart with UBO detail.",
      status: "OPEN",
      createdAt: nowIso(),
    },
  ],
  screening: [
    { type: "SANCTIONS", status: "CLEAR", lastCheckedAt: nowIso() },
    { type: "PEP", status: "UNDER_REVIEW", summary: "Potential match requiring review.", lastCheckedAt: nowIso() },
    { type: "ADVERSE_MEDIA", status: "NOT_RUN" },
  ],
  fieldIssues: [
    {
      fieldPath: "ownership",
      message: "Beneficial ownership not declared to threshold policy.",
      severity: "BLOCKER",
      requestedBy: "ADMIN",
      createdAt: nowIso(),
    },
  ],
  assignedReviewer: "reviewer_01",
};

const mockPersonCase: OnboardingPersonCase = {
  id: "kyc_per_001",
  kind: "PERSON",
  status: "IN_REVIEW",
  riskRating: "LOW",
  createdAt: nowIso(),
  updatedAt: nowIso(),
  institutionId: "client_inst_001",
  inviteCode: "INV-9F2A",
  person: {
    fullName: "Jamie Lee",
    dateOfBirth: "1994-11-06",
    nationality: ["Portugal"],
    residentialAddress: "Rua Exemplo 10, Lisbon, PT",
    email: "jamie.lee@example.com",
    roles: ["PLATFORM_USER"],
    pepDeclared: false,
    id: { type: "NATIONAL_ID", number: "PT-99999999", issuingCountry: "Portugal", expiry: "2031-01-01" },
  },
  documents: [{ id: "doc_101", type: "ID_DOCUMENT", filename: "id-front-back.png", uploadedAt: nowIso(), status: "UPLOADED" }],
  documentRequests: [],
  screening: [
    { type: "SANCTIONS", status: "NOT_RUN" },
    { type: "PEP", status: "NOT_RUN" },
    { type: "ADVERSE_MEDIA", status: "NOT_RUN" },
  ],
  fieldIssues: [],
  assignedReviewer: "reviewer_02",
};

export async function listOnboardingCases(): Promise<OnboardingCase[]> {
  return [mockInstitutionCase, mockPersonCase];
}

export async function getOnboardingCase(caseId: string): Promise<OnboardingCase | null> {
  const all = await listOnboardingCases();
  return all.find((c) => c.id === caseId) ?? null;
}

export async function updateCaseStatus(caseId: string, status: CaseStatus): Promise<void> {
  console.log("updateCaseStatus", { caseId, status });
}

export async function requestDocument(caseId: string, type: DocumentType, reason: string): Promise<void> {
  console.log("requestDocument", { caseId, type, reason });
}

export async function reviewDocument(caseId: string, docId: string, status: DocStatus, comment?: string): Promise<void> {
  console.log("reviewDocument", { caseId, docId, status, comment });
}

export async function setRiskRating(caseId: string, riskRating: RiskRating): Promise<void> {
  console.log("setRiskRating", { caseId, riskRating });
}
