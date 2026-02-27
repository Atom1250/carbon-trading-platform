import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRiskDashboardData } from "@/lib/admin/api";

function RiskList({ title, items }: { title: string; items: Array<{ id: string; name: string; riskScore: number; reason: string }> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {items.map((i) => (
          <div key={i.id} className="rounded-md border p-2">{i.name} | Risk {i.riskScore} | {i.reason}</div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function AdminRiskPage() {
  const data = await getRiskDashboardData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Risk Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RiskList title="High-risk onboarding" items={data.highRiskOnboarding} />
        <RiskList title="High-risk trades" items={data.highRiskTrades} />
        <RiskList title="High-risk projects" items={data.highRiskProjects} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Risk Trend (7d)</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {data.riskTrend.map((p) => (
            <div key={p.date} className="flex items-center justify-between rounded-md border p-2"><span>{p.date}</span><span>Avg risk {p.avgRiskScore}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
