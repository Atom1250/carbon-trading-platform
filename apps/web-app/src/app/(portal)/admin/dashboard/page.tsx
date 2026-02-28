import { AdminDashboardLive } from "@/components/admin/AdminDashboardLive";
import { getAdminDashboardData } from "@/lib/admin/api";
import { getAdminDashboardSnapshot } from "@/lib/api/portal";

export default async function AdminDashboardPage() {
  const [data, snapshot] = await Promise.all([getAdminDashboardData(), getAdminDashboardSnapshot()]);
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Contract snapshot: {snapshot.kpis.openTasks} open tasks, {snapshot.kpis.blockedSettlements} blocked settlements.
      </div>
      <AdminDashboardLive initialData={data} pollMs={30000} />
    </div>
  );
}
