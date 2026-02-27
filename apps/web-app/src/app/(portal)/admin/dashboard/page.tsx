import { AdminDashboardLive } from "@/components/admin/AdminDashboardLive";
import { getAdminDashboardData } from "@/lib/admin/api";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();
  return <AdminDashboardLive initialData={data} pollMs={30000} />;
}
