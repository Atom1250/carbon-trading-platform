import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectOfferingTerms } from "@/lib/investor/types";

export function CashLedgerTable({ terms }: { terms: ProjectOfferingTerms }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Cash Ledger (Interest & Principal)</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div>Instrument: {terms.instrument}</div>
        <div>Ask: {terms.currency} {terms.askAmount.toLocaleString()}</div>
        <div>Tenor/Coupon: {terms.tenorYears ?? "-"}y / {terms.couponPct ?? "-"}%</div>
        <div className="pt-2">TODO: schedule table (period, interest, principal, ending balance) and covenant assumptions.</div>
      </CardContent>
    </Card>
  );
}
