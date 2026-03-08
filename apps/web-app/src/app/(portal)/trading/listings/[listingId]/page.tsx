import Link from "next/link";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import { getListing } from "@/lib/trading/api";

export default async function ListingDetail({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const listing = await getListing(listingId);
  if (!listing) return <div className="text-sm text-muted-foreground">Listing not found.</div>;

  return (
    <FigmaPage
      title={listing.projectName}
      subtitle={`${listing.standard} | ${listing.registry} | ${listing.location}`}
      right={<Badge variant="outline">{listing.category}</Badge>}
    >
      <FigmaStatGrid
        stats={[
          { key: "qty", label: "Available Qty", value: listing.totalQty.toLocaleString() },
          { key: "lot", label: "Min Lot", value: listing.minLot.toLocaleString() },
          { key: "window", label: "Settlement", value: listing.settlementWindow },
          { key: "sellers", label: "Sellers", value: String(listing.sellers.anonymizedCount) },
        ]}
      />

      <FigmaPanel title="Listing Detail" subtitle="Methodology, pricing window, and RFQ handoff.">
        <div className="space-y-2 text-sm text-white/75">
          <div>Methodology: {listing.methodology}</div>
          <div>Vintages: {listing.vintages.join(", ")}</div>
          <div>Indicative range: {listing.indicativePricing.currency} {listing.indicativePricing.rangeLow} - {listing.indicativePricing.rangeHigh}</div>
          <div>Settlement window: {listing.settlementWindow}</div>
          <Link className="underline" href={`/trading/rfq/new?listingId=${listing.id}`}>Create RFQ</Link>
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
