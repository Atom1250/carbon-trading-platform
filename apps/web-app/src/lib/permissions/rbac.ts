import type { Persona, Visibility } from "@/lib/types/personas";

export function canViewVisibility(persona: Persona, visibility: Visibility): boolean {
  if (persona === "ADMIN") return true;
  if (visibility === "PUBLIC") return true;
  if (visibility === "ADMIN") return false;

  if (visibility === "NDA") {
    return persona === "INVESTOR" || persona === "PROJECT_OWNER" || persona === "CARBON_TRADER";
  }

  if (visibility === "APPROVED_INVESTOR") {
    return persona === "INVESTOR" || persona === "PROJECT_OWNER" || persona === "CARBON_TRADER";
  }

  return false;
}
