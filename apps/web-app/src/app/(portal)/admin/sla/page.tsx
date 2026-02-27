import { SlaMonitorLive } from "@/components/admin/SlaMonitorLive";
import { getSlaData } from "@/lib/admin/api";

export default async function AdminSlaPage() {
  const data = await getSlaData();
  return <SlaMonitorLive initialData={data} pollMs={30000} />;
}
