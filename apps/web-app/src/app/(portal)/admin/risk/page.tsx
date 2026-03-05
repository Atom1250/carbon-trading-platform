import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { getRiskDashboardData } from "@/lib/admin/api";

function RiskList({ title, items }: { title: string; items: Array<{ id: string; name: string; riskScore: number; reason: string }> }) {
  return (
    <FigmaPanel title={title}>
      <div className="space-y-2 text-sm">
        {items.map((i) => (
          <FigmaListItem key={i.id} title={i.name} meta={`Risk ${i.riskScore}`} body={i.reason} />
        ))}
      </div>
    </FigmaPanel>
  );
}

export default async function AdminRiskPage() {
  const data = await getRiskDashboardData();
  const trendAvg =
    data.riskTrend.length === 0
      ? 0
      : Math.round(data.riskTrend.reduce((acc, p) => acc + p.avgRiskScore, 0) / data.riskTrend.length);

  return (
    <FigmaPage title="Risk Dashboard" subtitle="Cross-domain risk posture and trend monitoring.">
      <FigmaStatGrid
        stats={[
          { key: "onboarding", label: "High-Risk Onboarding", value: String(data.highRiskOnboarding.length) },
          { key: "trades", label: "High-Risk Trades", value: String(data.highRiskTrades.length) },
          { key: "projects", label: "High-Risk Projects", value: String(data.highRiskProjects.length) },
          { key: "avg", label: "7d Avg Risk", value: String(trendAvg) },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RiskList title="High-risk onboarding" items={data.highRiskOnboarding} />
        <RiskList title="High-risk trades" items={data.highRiskTrades} />
        <RiskList title="High-risk projects" items={data.highRiskProjects} />
      </div>

      <FigmaPanel title="Risk Trend (7d)" subtitle="Rolling daily average risk score by domain mix.">
        <div className="space-y-1 text-sm">
          {data.riskTrend.map((p) => (
            <div key={p.date} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#071326] p-2">
              <span>{p.date}</span>
              <span>Avg risk {p.avgRiskScore}</span>
            </div>
          ))}
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
