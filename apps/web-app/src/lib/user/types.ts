export type Persona = "PROJECT_OWNER" | "INVESTOR" | "CARBON_TRADER" | "ADMIN";

export interface CurrentUser {
  id: string;
  name: string;
  persona: Persona;
  orgName?: string;
  entitlements: {
    investorPortal: boolean;
    projectOwnerPortal: boolean;
    tradingPortal: boolean;
    adminPortal: boolean;
  };
}
