import type { Persona } from "@/lib/types/personas";

export type CaseKind = "INSTITUTION" | "PERSON";

export type CaseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "ACTION_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "CONDITIONAL_APPROVAL";

export type RiskRating = "LOW" | "MEDIUM" | "HIGH";

export type DocumentType =
  | "CERT_INCORPORATION"
  | "REGISTRY_EXCERPT"
  | "ARTICLES_MEMORANDUM"
  | "PROOF_REGISTERED_ADDRESS"
  | "BOARD_RESOLUTION_SIGNATORIES"
  | "OWNERSHIP_CHART"
  | "FINANCIAL_STATEMENTS"
  | "AML_POLICY"
  | "ID_DOCUMENT"
  | "PROOF_RESIDENTIAL_ADDRESS"
  | "OTHER";

export type DocStatus = "MISSING" | "UPLOADED" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export type ScreeningType = "SANCTIONS" | "PEP" | "ADVERSE_MEDIA";
export type ScreeningStatus = "NOT_RUN" | "CLEAR" | "HIT" | "UNDER_REVIEW" | "CLEARED" | "CONFIRMED_HIT";

export interface FieldIssue {
  fieldPath: string;
  message: string;
  severity: "BLOCKER" | "WARNING";
  requestedBy?: Persona;
  createdAt: string;
}

export interface DocumentArtifact {
  id: string;
  type: DocumentType;
  filename: string;
  uploadedAt: string;
  status: DocStatus;
  reviewerComment?: string;
}

export interface DocumentRequest {
  id: string;
  type: DocumentType;
  reason: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
}

export interface ScreeningResult {
  type: ScreeningType;
  status: ScreeningStatus;
  summary?: string;
  lastCheckedAt?: string;
}

export interface InstitutionProfile {
  legalName: string;
  tradingName?: string;
  registrationNumber: string;
  incorporationDate?: string;
  legalForm?: string;
  countryOfIncorporation: string;
  registeredAddress: string;
  principalPlaceOfBusiness?: string;
  website?: string;
  regulated: boolean;
  regulatorName?: string;
  licenseType?: string;
  licenseNumber?: string;
}

export interface BusinessPurpose {
  industry: string;
  purposeOfRelationship: string;
  expectedProducts: string[];
  expectedAnnualVolume?: number;
  expectedTicketSize?: number;
  operatingCountries?: string[];
  sourceOfFunds?: string;
  sourceOfWealth?: string;
}

export type PartyRole = "BENEFICIAL_OWNER" | "DIRECTOR" | "SIGNATORY" | "PLATFORM_USER";

export interface PersonKyc {
  fullName: string;
  dateOfBirth: string;
  nationality: string[];
  residentialAddress: string;
  email: string;
  phone?: string;
  roles: PartyRole[];
  pepDeclared: boolean;
  id: {
    type: "PASSPORT" | "NATIONAL_ID" | "DRIVERS_LICENSE";
    number: string;
    issuingCountry: string;
    expiry: string;
  };
}

export interface EntityOwner {
  legalName: string;
  registrationNumber: string;
  countryOfIncorporation: string;
}

export interface OwnershipNodeRef {
  kind: "PERSON" | "ENTITY";
  refId: string;
}

export interface OwnershipEdge {
  from: OwnershipNodeRef;
  to: OwnershipNodeRef;
  ownershipPct?: number;
  controlType?: "OWNERSHIP" | "VOTING" | "CONTROL_OTHER";
}

export interface OnboardingInstitutionCase {
  id: string;
  kind: "INSTITUTION";
  status: CaseStatus;
  riskRating: RiskRating;
  createdAt: string;
  updatedAt: string;
  institution: InstitutionProfile;
  business: BusinessPurpose;
  people: Array<{ id: string; profile: PersonKyc }>;
  entities: Array<{ id: string; profile: EntityOwner }>;
  ownership: OwnershipEdge[];
  documents: DocumentArtifact[];
  documentRequests: DocumentRequest[];
  screening: ScreeningResult[];
  fieldIssues: FieldIssue[];
  assignedReviewer?: string;
  ndaRequired?: boolean;
}

export interface OnboardingPersonCase {
  id: string;
  kind: "PERSON";
  status: CaseStatus;
  riskRating: RiskRating;
  createdAt: string;
  updatedAt: string;
  institutionId?: string;
  inviteCode?: string;
  person: PersonKyc;
  documents: DocumentArtifact[];
  documentRequests: DocumentRequest[];
  screening: ScreeningResult[];
  fieldIssues: FieldIssue[];
  assignedReviewer?: string;
}

export type OnboardingCase = OnboardingInstitutionCase | OnboardingPersonCase;
