import { NextResponse } from "next/server";
import { getSlaData } from "@/lib/admin/api";

export async function GET() {
  const data = await getSlaData();
  return NextResponse.json({ ...data, polledAt: new Date().toISOString() });
}
