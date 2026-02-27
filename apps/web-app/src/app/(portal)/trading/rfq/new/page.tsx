import Link from "next/link";
import { RfqWizard } from "@/components/trading/RfqWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getListing } from "@/lib/trading/api";

export default async function NewRfqPage({
  searchParams,
}: {
  searchParams?: Promise<{ listingId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedListing = params.listingId ? await getListing(params.listingId) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create RFQ</h1>

      {selectedListing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prefilled From Listing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="font-medium">{selectedListing.projectName}</div>
            <div className="text-muted-foreground">
              {selectedListing.standard} | {selectedListing.registry} | {selectedListing.methodology}
            </div>
            <div>
              Indicative: {selectedListing.indicativePricing.currency} {selectedListing.indicativePricing.mid} ({selectedListing.indicativePricing.rangeLow}-{selectedListing.indicativePricing.rangeHigh})
            </div>
            <div>Available: {selectedListing.totalQty.toLocaleString()} | Min lot: {selectedListing.minLot.toLocaleString()}</div>
            <div>Settlement window: {selectedListing.settlementWindow}</div>
            <div>Default qty suggestion: {selectedListing.minLot.toLocaleString()}</div>
            <div>Default vintages: {selectedListing.vintages.join(", ")}</div>
          </CardContent>
        </Card>
      )}

      {!selectedListing && (
        <Card>
          <CardHeader><CardTitle className="text-base">Start Point</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Start from a listing to prefill this wizard: <Link className="underline" href="/trading">go to marketplace</Link>.
          </CardContent>
        </Card>
      )}

      <RfqWizard prefilledListing={selectedListing} />
    </div>
  );
}
