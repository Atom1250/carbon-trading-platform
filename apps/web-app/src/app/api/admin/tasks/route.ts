import { NextRequest, NextResponse } from "next/server";
import { bulkAssignTasks, listAdminTasks, updateTask } from "@/lib/admin/api";

export async function GET() {
  const data = await listAdminTasks();
  return NextResponse.json({ tasks: data, polledAt: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body?.action === "bulkAssign") {
    const tasks = await bulkAssignTasks(body.taskIds ?? [], body.assignedAdmin ?? "admin_ops");
    return NextResponse.json({ tasks });
  }

  if (body?.action === "updateTask") {
    const task = await updateTask(body.taskId, {
      status: body.status,
      escalationFlag: body.escalationFlag,
      assignedAdmin: body.assignedAdmin,
    });
    return NextResponse.json({ task });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
