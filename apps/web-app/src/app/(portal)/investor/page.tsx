import Link from "next/link";
import { ProjectCardInvestor } from "@/components/investor/ProjectCardInvestor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvestorMandate, listCatalog } from "@/lib/investor/api";

function computeMatchScoreStub() {
  return Math.floor(60 + Math.random() * 35);
}

export default async function InvestorCatalog() {
  const [mandate, projects] = await Promise.all([getInvestorMandate(), listCatalog()]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Investor Catalog</h1>
          <div className="text-sm text-muted-foreground">
            Saved mandate: <span className="font-medium text-foreground">{mandate.name}</span> | <Link className="underline" href="/investor/mandate">Edit mandate</Link> | <Link className="underline" href="/investor/search">Advanced search</Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recommended (stub)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">TODO: rank by match score, readiness, return, impact, and risk per mandate weights.</CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {projects.map((p) => (
          <ProjectCardInvestor key={p.projectId} p={p} matchScore={computeMatchScoreStub()} />
        ))}
      </div>
    </div>
  );
}
