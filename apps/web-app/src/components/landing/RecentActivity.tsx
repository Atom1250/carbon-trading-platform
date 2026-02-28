import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSnapshot } from "@/lib/api/contracts";

export function RecentActivity({ recents }: { recents: DashboardSnapshot["recent"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {recents.map((r, idx) => (
          <div key={idx} className="flex items-start justify-between gap-3">
            <Link className="underline" href={r.href}>
              {r.label}
            </Link>
            <div className="whitespace-nowrap text-xs text-muted-foreground">{r.meta}</div>
          </div>
        ))}
        {recents.length === 0 && <div className="text-xs text-muted-foreground">No recent activity yet.</div>}
      </CardContent>
    </Card>
  );
}
