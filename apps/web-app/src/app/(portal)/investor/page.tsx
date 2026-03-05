import Link from "next/link";
import { ProjectCardInvestor } from "@/components/investor/ProjectCardInvestor";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { getInvestorMandate, listCatalog } from "@/lib/investor/api";

function computeMatchScoreStub() {
  return Math.floor(60 + Math.random() * 35);
}

export default async function InvestorCatalog() {
  const [mandate, projects] = await Promise.all([getInvestorMandate(), listCatalog()]);
  const avgReadiness = projects.length === 0 ? 0 : Math.round(projects.reduce((acc, item) => acc + item.readinessScore, 0) / projects.length);
  const avgAsk = projects.length === 0 ? 0 : Math.round(projects.reduce((acc, item) => acc + item.terms.askAmount, 0) / projects.length);

  return (
    <FigmaPage
      title="Investor Catalog"
      subtitle={`Saved mandate: ${mandate.name}`}
      right={
        <div className="text-sm text-white/70">
          <Link className="underline" href="/investor/mandate">Edit mandate</Link> |{" "}
          <Link className="underline" href="/investor/search">Advanced search</Link>
        </div>
      }
    >
      <FigmaStatGrid
        stats={[
          { key: "catalog", label: "Catalog Projects", value: String(projects.length) },
          { key: "readiness", label: "Avg Readiness", value: `${avgReadiness}%` },
          { key: "ask", label: "Avg Funding Ask", value: `$${avgAsk.toLocaleString()}` },
          { key: "mandate", label: "Mandate Profile", value: "Applied" },
        ]}
      />

      <FigmaPanel title="Recommended (stub)" subtitle="Ranking pipeline to be replaced by deterministic mandate scoring.">
        <div className="text-sm text-white/75">
          TODO: rank by match score, readiness, return, impact, and risk per mandate weights.
        </div>
      </FigmaPanel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {projects.map((p) => (
          <ProjectCardInvestor key={p.projectId} p={p} matchScore={computeMatchScoreStub()} />
        ))}
      </div>
    </FigmaPage>
  );
}
