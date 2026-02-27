import type { CurrentUser, Persona } from "@/lib/user/types";

const entitlementByPersona: Record<Persona, CurrentUser["entitlements"]> = {
  PROJECT_OWNER: { investorPortal: false, projectOwnerPortal: true, tradingPortal: false, adminPortal: false },
  INVESTOR: { investorPortal: true, projectOwnerPortal: false, tradingPortal: true, adminPortal: false },
  CARBON_TRADER: { investorPortal: false, projectOwnerPortal: false, tradingPortal: true, adminPortal: false },
  ADMIN: { investorPortal: true, projectOwnerPortal: true, tradingPortal: true, adminPortal: true },
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const persona: Persona = "INVESTOR";
  return {
    id: "u_001",
    name: "Alex Morgan",
    persona,
    orgName: "Example Capital",
    entitlements: entitlementByPersona[persona],
  };
}
