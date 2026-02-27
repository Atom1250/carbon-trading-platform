"use client";

import { useEffect, useMemo, useState } from "react";
import { ProjectCardInvestor } from "@/components/investor/ProjectCardInvestor";
import { QuickFilterBar } from "@/components/investor/search/QuickFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvestorMandate, listCatalog } from "@/lib/investor/api";
import { useInvestorStore } from "@/lib/investor/store";
import type { InvestorProjectCardModel } from "@/lib/investor/types";

function matchStub(_p: InvestorProjectCardModel) {
  return Math.floor(55 + Math.random() * 40);
}

export default function InvestorSearch() {
  const { results, setResults, setMandate, quickFilters, setQuickFilters } = useInvestorStore();
  const [all, setAll] = useState<InvestorProjectCardModel[]>([]);

  useEffect(() => {
    (async () => {
      const [m, c] = await Promise.all([getInvestorMandate(), listCatalog()]);
      setMandate(m);
      setAll(c);
      setResults(c);
    })();
  }, [setMandate, setResults]);

  const filtered = useMemo(() => {
    let r = [...all];
    if (quickFilters.category) r = r.filter((p) => p.category === quickFilters.category);
    if (quickFilters.stage) r = r.filter((p) => p.stage === quickFilters.stage);
    if (quickFilters.country) r = r.filter((p) => p.country === quickFilters.country);
    if (quickFilters.creditsOnly) r = r.filter((p) => p.terms.carbonComponent.enabled);
    return r;
  }, [all, quickFilters]);

  useEffect(() => setResults(filtered), [filtered, setResults]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Advanced Search</h1>
        <div className="text-sm text-muted-foreground">Quick filters now; add advanced underwriting criteria + saved searches next.</div>
      </div>

      <QuickFilterBar onChange={(q) => setQuickFilters(q)} />

      <Card>
        <CardHeader><CardTitle className="text-base">Advanced criteria (TODO)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add ticket, instrument, tenor/coupon, DSCR, PPA status, permits, interconnection, methodology, risk threshold, and save-search.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {results.map((p) => (
          <ProjectCardInvestor key={p.projectId} p={p} matchScore={matchStub(p)} />
        ))}
      </div>
    </div>
  );
}
