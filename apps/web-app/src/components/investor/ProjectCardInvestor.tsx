import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { InvestorProjectCardModel } from "@/lib/investor/types";

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString()}`;
}

export function ProjectCardInvestor({ p, matchScore }: { p: InvestorProjectCardModel; matchScore?: number }) {
  const terms = p.terms;
  const carbon = terms.carbonComponent;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{p.name}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {p.country}
              {p.region ? ` | ${p.region}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant="secondary">{p.category}</Badge>
            <Badge variant="outline">{p.stage}</Badge>
            <Badge variant="outline">Risk: {p.riskRating}</Badge>
          </div>
        </div>

        {matchScore !== undefined && (
          <div className="text-sm text-muted-foreground">
            Mandate match: <span className="font-medium text-foreground">{Math.round(matchScore)}%</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Ask</div>
            <div className="font-medium">{money(terms.askAmount, terms.currency)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Instrument</div>
            <div className="font-medium">{terms.instrument}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Tenor / Coupon</div>
            <div className="font-medium">
              {terms.tenorYears ? `${terms.tenorYears}y` : "-"} / {terms.couponPct !== undefined ? `${terms.couponPct}%` : "-"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Carbon Yield</div>
            <div className="font-medium">
              {carbon.enabled && carbon.expectedAnnualCreditsTco2e ? `${carbon.expectedAnnualCreditsTco2e.toLocaleString()} tCO2e/yr` : "N/A"}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Readiness</span>
            <span className="font-medium">{p.readinessScore}%</span>
          </div>
          <Progress value={p.readinessScore} />
        </div>

        <div className="flex flex-wrap gap-2">
          {p.badges.slice(0, 3).map((b) => (
            <Badge key={b} variant="outline">
              {b}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="underline" href={`/investor/projects/${p.projectId}`}>View</Link>
          <Link className="underline" href={`/investor/projects/${p.projectId}/underwrite`}>Underwrite</Link>
          <Link className="underline" href={`/investor/messages?projectId=${p.projectId}`}>Q&A</Link>
        </div>
      </CardContent>
    </Card>
  );
}
