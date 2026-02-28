import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSnapshot } from "@/lib/api/contracts";

export function PlatformHealth({ metrics }: { metrics: DashboardSnapshot["health"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Platform health</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {metrics.map((t) => (
          <div key={t.key} className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">{t.label}</div>
            <div className="text-xl font-semibold">{t.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
