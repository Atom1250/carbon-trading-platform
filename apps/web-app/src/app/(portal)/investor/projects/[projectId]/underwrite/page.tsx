import { CashLedgerTable } from "@/components/investor/underwrite/CashLedgerTable";
import { CarbonLedgerTable } from "@/components/investor/underwrite/CarbonLedgerTable";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import { getUnderwriting } from "@/lib/investor/api";

export default async function Underwrite({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const u = await getUnderwriting(projectId);
  if (!u) return <div className="text-sm text-muted-foreground">Underwriting data not found.</div>;

  return (
    <FigmaPage
      title="Underwrite"
      subtitle={`Project ID: ${u.projectId}`}
      right={
        <div className="flex gap-2">
          <Badge variant="secondary">Readiness {u.readinessScore}%</Badge>
          <Badge variant="outline">Risk {u.riskRating}</Badge>
        </div>
      }
    >
      <FigmaStatGrid
        stats={[
          { key: "readiness", label: "Readiness", value: `${u.readinessScore}%` },
          { key: "risk", label: "Risk", value: u.riskRating },
          { key: "instrument", label: "Instrument", value: u.terms.instrument },
          { key: "ask", label: "Ask Amount", value: `${u.terms.currency} ${u.terms.askAmount.toLocaleString()}` },
        ]}
      />

      <FigmaPanel title="Scenario Controls (TODO)" subtitle="Base/Downside/Upside and carbon sensitivity.">
        <div className="text-sm text-white/75">Implement Base/Downside/Upside assumptions and optional carbon price sensitivity.</div>
      </FigmaPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CashLedgerTable terms={u.terms} />
        <CarbonLedgerTable terms={u.terms} />
      </div>

      <FigmaPanel title="Export (Placeholder)" subtitle="Underwriting package outputs.">
        <div className="text-sm text-white/75">Add export underwriting JSON and IC memo placeholder actions.</div>
      </FigmaPanel>
    </FigmaPage>
  );
}
