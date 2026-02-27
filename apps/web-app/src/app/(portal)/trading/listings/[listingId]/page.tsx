import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getListing } from "@/lib/trading/api";

export default async function ListingDetail({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const listing = await getListing(listingId);
  if (!listing) return <div className="text-sm text-muted-foreground">Listing not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{listing.projectName}</h1>
          <div className="text-sm text-muted-foreground">{listing.standard} | {listing.registry} | {listing.location}</div>
        </div>
        <Badge variant="outline">{listing.category}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Listing Detail</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Methodology: {listing.methodology}</div>
          <div>Vintages: {listing.vintages.join(", ")}</div>
          <div>Indicative range: {listing.indicativePricing.currency} {listing.indicativePricing.rangeLow} - {listing.indicativePricing.rangeHigh}</div>
          <div>Settlement window: {listing.settlementWindow}</div>
          <Link className="underline" href={`/trading/rfq/new?listingId=${listing.id}`}>Create RFQ</Link>
        </CardContent>
      </Card>
    </div>
  );
}
