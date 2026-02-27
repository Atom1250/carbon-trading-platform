import { PortalShell } from "@/components/layout/PortalShell";
import { getCurrentUser } from "@/lib/user/current";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <PortalShell user={user}>{children}</PortalShell>;
}
