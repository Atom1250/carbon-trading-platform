import type { CurrentUser } from "@/lib/user/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlatformHealth({ user }: { user: CurrentUser }) {
  const tiles = [
    { key: "projectsReady", label: "Projects investor-ready", value: "12" },
    { key: "rfqsOpen", label: "Open RFQs", value: "8" },
    { key: "tradesSettling", label: "Trades settling", value: "3" },
    { key: "slaBreaches", label: "SLA breaches", value: user.entitlements.adminPortal ? "1" : "-" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Platform health</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.key} className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">{t.label}</div>
            <div className="text-xl font-semibold">{t.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
