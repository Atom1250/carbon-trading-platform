import type { NavSection } from "@/lib/nav/types";

export const NAV_SECTIONS: NavSection[] = [
  {
    key: "core",
    label: "Core",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        visibilityByPersona: {
          PROJECT_OWNER: "VISIBLE",
          INVESTOR: "VISIBLE",
          CARBON_TRADER: "VISIBLE",
          ADMIN: "VISIBLE",
        },
        description: "Your overview and next actions",
      },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    items: [
      {
        key: "projectOwner",
        label: "Project Owner Portal",
        href: "/owner",
        visibilityByPersona: {
          PROJECT_OWNER: "VISIBLE",
          INVESTOR: "GATED",
          CARBON_TRADER: "HIDDEN",
          ADMIN: "VISIBLE",
        },
        description: "Create projects and manage dataroom readiness",
      },
      {
        key: "investor",
        label: "Investor Portal",
        href: "/investor",
        visibilityByPersona: {
          PROJECT_OWNER: "GATED",
          INVESTOR: "VISIBLE",
          CARBON_TRADER: "GATED",
          ADMIN: "VISIBLE",
        },
        description: "Search, underwrite, diligence, invest",
      },
    ],
  },
  {
    key: "trading",
    label: "Trading",
    items: [
      {
        key: "market",
        label: "Carbon Trading (RFQ)",
        href: "/trading",
        visibilityByPersona: {
          PROJECT_OWNER: "GATED",
          INVESTOR: "VISIBLE",
          CARBON_TRADER: "VISIBLE",
          ADMIN: "VISIBLE",
        },
        description: "Listings, RFQs, quotes, OTC DvP settlement",
      },
    ],
  },
  {
    key: "onboarding",
    label: "Onboarding",
    items: [
      {
        key: "onboardingUser",
        label: "Client Onboarding",
        href: "/onboarding/start",
        visibilityByPersona: {
          PROJECT_OWNER: "VISIBLE",
          INVESTOR: "VISIBLE",
          CARBON_TRADER: "VISIBLE",
          ADMIN: "VISIBLE",
        },
        description: "KYC/AML, trading enablement, permissions",
      },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    items: [
      {
        key: "adminDashboard",
        label: "Admin Command Centre",
        href: "/admin/dashboard",
        visibilityByPersona: {
          PROJECT_OWNER: "HIDDEN",
          INVESTOR: "HIDDEN",
          CARBON_TRADER: "HIDDEN",
          ADMIN: "VISIBLE",
        },
        description: "Tasks, SLAs, risk, oversight",
      },
    ],
  },
];
