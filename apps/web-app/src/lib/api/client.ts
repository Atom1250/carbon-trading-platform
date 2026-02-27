import type { ProjectSnapshot } from "@/lib/types/personas";

export async function listOwnerProjects(): Promise<ProjectSnapshot[]> {
  return [
    {
      id: "p_001",
      name: "Sunridge Solar SPV",
      category: "RENEWABLE_ENERGY",
      subtype: "Solar",
      country: "Portugal",
      region: "Alentejo",
      stage: "FEASIBILITY",
      status: "DRAFT",
      fundingAskAmount: 25000000,
      fundingAskCurrency: "EUR",
      annualCreditsTco2e: 42000,
      projectLifeYears: 25,
      ndaRequired: true,
      readinessScore: 42,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "p_002",
      name: "Coastal Mangrove Restoration",
      category: "BIODIVERSITY",
      subtype: "Blue Carbon",
      country: "Mozambique",
      region: "Sofala",
      stage: "CONCEPT",
      status: "IN_REVIEW",
      fundingAskAmount: 6000000,
      fundingAskCurrency: "USD",
      annualCreditsTco2e: 180000,
      projectLifeYears: 30,
      ndaRequired: true,
      readinessScore: 18,
      updatedAt: new Date().toISOString(),
    },
  ];
}
