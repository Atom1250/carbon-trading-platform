import "server-only";

import { cookies, headers } from "next/headers";
import type { CurrentUser, Persona } from "@/lib/user/types";

type SafeUser = {
  id: string;
  institutionId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  mfaEnabled: boolean;
};

const fallbackPersona: Persona = "INVESTOR";

const entitlementByPersona: Record<Persona, CurrentUser["entitlements"]> = {
  PROJECT_OWNER: { investorPortal: false, projectOwnerPortal: true, tradingPortal: false, adminPortal: false },
  INVESTOR: { investorPortal: true, projectOwnerPortal: false, tradingPortal: true, adminPortal: false },
  CARBON_TRADER: { investorPortal: false, projectOwnerPortal: false, tradingPortal: true, adminPortal: false },
  ADMIN: { investorPortal: true, projectOwnerPortal: true, tradingPortal: true, adminPortal: true },
};

function roleToPersona(role?: string): Persona {
  switch ((role ?? "").toLowerCase()) {
    case "investor":
      return "INVESTOR";
    case "developer":
      return "PROJECT_OWNER";
    case "compliance_officer":
    case "operations":
      return "ADMIN";
    case "carbon_trader":
    case "trader":
      return "CARBON_TRADER";
    default:
      return fallbackPersona;
  }
}

function apiBaseUrl() {
  return process.env["API_GATEWAY_URL"] ?? process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function readSessionToken() {
  const store = await cookies();
  const hdrs = await headers();

  const authHeader = hdrs.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const tokenKeys = ["access_token", "accessToken", "token"];
  for (const key of tokenKeys) {
    const raw = store.get(key)?.value;
    if (raw) return raw;
  }

  return null;
}

async function fetchSafeUser(token: string): Promise<SafeUser | null> {
  try {
    const store = await cookies();
    const cookieHeader = store
      .getAll()
      .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
      .join("; ");

    const response = await fetch(`${apiBaseUrl()}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const body = (await response.json()) as { data?: SafeUser };
    return body.data ?? null;
  } catch {
    return null;
  }
}

function fallbackUserFromPersona(persona: Persona): CurrentUser {
  return {
    id: "u_fallback",
    name: "Guest User",
    persona,
    orgName: "Platform Workspace",
    entitlements: entitlementByPersona[persona],
  };
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const token = await readSessionToken();
  if (!token) return fallbackUserFromPersona(fallbackPersona);

  const safeUser = await fetchSafeUser(token);
  if (safeUser) {
    const persona = roleToPersona(safeUser.role);
    return {
      id: safeUser.id,
      name: `${safeUser.firstName} ${safeUser.lastName}`.trim(),
      persona,
      orgName: safeUser.institutionId,
      entitlements: entitlementByPersona[persona],
    };
  }

  // If /auth/me is unavailable but token exists, derive role claims for persona gating.
  const claims = decodeJwtPayload(token);
  const persona = roleToPersona(typeof claims?.["role"] === "string" ? claims["role"] : undefined);
  return fallbackUserFromPersona(persona);
}
