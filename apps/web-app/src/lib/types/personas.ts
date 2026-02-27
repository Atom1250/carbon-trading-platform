export type Persona = "PROJECT_OWNER" | "INVESTOR" | "CARBON_TRADER" | "ADMIN";

export type Visibility = "PUBLIC" | "NDA" | "APPROVED_INVESTOR" | "ADMIN";

export type ProjectCategory = "RENEWABLE_ENERGY" | "GREEN_INFRASTRUCTURE" | "BIODIVERSITY";

export type ProjectStage =
  | "CONCEPT"
  | "FEASIBILITY"
  | "PERMITTED"
  | "READY_TO_BUILD"
  | "CONSTRUCTION"
  | "OPERATING";

export type ProjectStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";

export interface ProjectSnapshot {
  id: string;
  name: string;
  category: ProjectCategory;
  subtype?: string;
  country: string;
  region?: string;
  stage: ProjectStage;
  status: ProjectStatus;
  fundingAskAmount?: number;
  fundingAskCurrency?: string;
  annualCreditsTco2e?: number | null;
  projectLifeYears?: number | null;
  ndaRequired?: boolean;
  readinessScore?: number;
  updatedAt?: string;
}
