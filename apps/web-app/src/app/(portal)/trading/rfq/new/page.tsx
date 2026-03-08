import Link from "next/link";
import { RfqWizard } from "@/components/trading/RfqWizard";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { getListing } from "@/lib/trading/api";

export default async function NewRfqPage({
  searchParams,
}: {
  searchParams?: Promise<{ listingId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedListing = params.listingId ? await getListing(params.listingId) : null;

  return (
    <FigmaPage title="Create RFQ" subtitle="Initiate structured quote requests for selected inventory and delivery windows.">
      <FigmaStatGrid
        stats={[
          { key: "prefill", label: "Prefill Source", value: selectedListing ? "Listing" : "Manual" },
          { key: "workflow", label: "Workflow", value: "Wizard" },
          { key: "validation", label: "Validation", value: "Active" },
          { key: "status", label: "Submission State", value: "Draft" },
        ]}
      />

      {selectedListing && (
        <FigmaPanel title="Prefilled From Listing" subtitle="Listing context mapped into RFQ defaults.">
          <div className="space-y-1 text-sm text-white/80">
            <div className="font-medium">{selectedListing.projectName}</div>
            <div className="text-white/60">
              {selectedListing.standard} | {selectedListing.registry} | {selectedListing.methodology}
            </div>
            <div>
              Indicative: {selectedListing.indicativePricing.currency} {selectedListing.indicativePricing.mid} ({selectedListing.indicativePricing.rangeLow}-{selectedListing.indicativePricing.rangeHigh})
            </div>
            <div>Available: {selectedListing.totalQty.toLocaleString()} | Min lot: {selectedListing.minLot.toLocaleString()}</div>
            <div>Settlement window: {selectedListing.settlementWindow}</div>
            <div>Default qty suggestion: {selectedListing.minLot.toLocaleString()}</div>
            <div>Default vintages: {selectedListing.vintages.join(", ")}</div>
          </div>
        </FigmaPanel>
      )}

      {!selectedListing && (
        <FigmaPanel title="Start Point" subtitle="Begin from marketplace listing or continue manually.">
          <div className="text-sm text-white/75">
            Start from a listing to prefill this wizard: <Link className="underline" href="/trading">go to marketplace</Link>.
          </div>
        </FigmaPanel>
      )}

      <RfqWizard prefilledListing={selectedListing} />
    </FigmaPage>
  );
}
