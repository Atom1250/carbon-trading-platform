import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectOfferingTerms } from "@/lib/investor/types";

export function CarbonLedgerTable({ terms }: { terms: ProjectOfferingTerms }) {
  const c = terms.carbonComponent;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Carbon Ledger (Issuance & Delivery)</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {!c.enabled && <div>Carbon component not enabled for this offering.</div>}
        {c.enabled && (
          <>
            <div>Delivery type: {c.deliveryType ?? "-"}</div>
            <div>Expected annual credits: {c.expectedAnnualCreditsTco2e ? `${c.expectedAnnualCreditsTco2e.toLocaleString()} tCO2e/yr` : "-"}</div>
            <div>Standard/Registry: {c.standard ?? "-"} / {c.registry ?? "-"}</div>
            <div className="pt-2">TODO: issuance schedule by vintage + shortfall handling mechanics.</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
