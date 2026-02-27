import { TaskEngineClient } from "@/components/admin/TaskEngineClient";
import { listAdminTasks } from "@/lib/admin/api";

export default async function AdminTasksPage() {
  const tasks = await listAdminTasks();
  return <TaskEngineClient initialTasks={tasks} />;
}
