import { NextResponse } from "next/server";
import { getAdminDashboardData } from "@/lib/admin/api";

export async function GET() {
  const data = await getAdminDashboardData();
  return NextResponse.json({ ...data, polledAt: new Date().toISOString() });
}
