import { getCurrentUser } from "@/lib/user/current";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { QuickActions } from "@/components/landing/QuickActions";
import { WorkQueue } from "@/components/landing/WorkQueue";
import { RecentActivity } from "@/components/landing/RecentActivity";
import { PlatformHealth } from "@/components/landing/PlatformHealth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/api/portal";

function heroCopy(persona: string) {
  switch (persona) {
    case "PROJECT_OWNER":
      return {
        title: "Project Owner Dashboard",
        subtitle: "Improve readiness, respond to diligence, and publish investor-safe data.",
      };
    case "INVESTOR":
      return {
        title: "Investor Dashboard",
        subtitle: "Discover opportunities, underwrite efficiently, and manage diligence in one place.",
      };
    case "CARBON_TRADER":
      return {
        title: "Carbon Trading Dashboard",
        subtitle: "RFQs, quotes, OTC trades, and DvP settlement tracking in one workspace.",
      };
    case "ADMIN":
      return {
        title: "Admin Command Centre",
        subtitle: "Work queues, SLAs, risk triage, and platform oversight.",
      };
    default:
      return { title: "Dashboard", subtitle: "Overview and next actions." };
  }
}

export default async function Dashboard() {
  const user = await getCurrentUser();
  const snapshot = await getDashboardSnapshot(user);
  const hero = heroCopy(user.persona);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold">{hero.title}</div>
            <div className="text-sm text-muted-foreground">{hero.subtitle}</div>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{user.name}</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start here</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>
            Use <span className="font-medium text-foreground">Ctrl/⌘ + K</span> to search across modules.
          </div>
          <div className="text-xs text-muted-foreground">TODO: wire command palette to real data sources with scoped search.</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <QuickActions user={user} />
          <RecentActivity recents={snapshot.recent} />
        </div>

        <div className="space-y-4 xl:col-span-2">
          <WorkQueue items={snapshot.workQueue} />
          <PlatformHealth metrics={snapshot.health} />
        </div>
      </div>
    </div>
  );
}
