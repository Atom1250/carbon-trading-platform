import type { Persona } from "@/lib/user/types";

export type NavVisibility = "VISIBLE" | "GATED" | "HIDDEN";

export interface NavItem {
  key: string;
  label: string;
  href?: string;
  icon?: string;
  visibilityByPersona: Record<Persona, NavVisibility>;
  children?: NavItem[];
  description?: string;
}

export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}
