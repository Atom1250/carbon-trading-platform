import Link from "next/link";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import { listCatalog } from "@/lib/investor/api";

export default async function InvestorProject({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const catalog = await listCatalog();
  const p = catalog.find((x) => x.projectId === projectId);

  if (!p) return <div className="text-sm text-muted-foreground">Project not found.</div>;

  return (
    <FigmaPage
      title={p.name}
      subtitle={`${p.country}${p.region ? ` | ${p.region}` : ""}`}
      right={
        <div className="flex gap-2">
          <Badge variant="secondary">{p.category}</Badge>
          <Badge variant="outline">{p.stage}</Badge>
        </div>
      }
    >
      <FigmaStatGrid
        stats={[
          { key: "readiness", label: "Readiness", value: `${p.readinessScore}%` },
          { key: "risk", label: "Risk Rating", value: p.riskRating },
          { key: "ask", label: "Funding Ask", value: `${p.terms.currency} ${p.terms.askAmount.toLocaleString()}` },
          { key: "credits", label: "Carbon Component", value: p.terms.carbonComponent.enabled ? "Enabled" : "Disabled" },
        ]}
      />

      <FigmaPanel title="Teaser vs Dataroom Gating (TODO)" subtitle="NDA and approval scoped access control model.">
        <div className="space-y-2 text-sm text-white/75">
          <div>Implement NDA/approval-based access gating and dataroom tabs for full investor diligence.</div>
          <div className="flex gap-3">
            <Link className="underline" href={`/investor/projects/${p.projectId}/underwrite`}>Go to Underwrite</Link>
            <Link className="underline" href={`/investor/messages?projectId=${p.projectId}`}>Go to Q&A</Link>
          </div>
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
