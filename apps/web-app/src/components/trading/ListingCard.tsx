import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreditListing } from "@/lib/trading/types";

export function ListingCard({ listing, score }: { listing: CreditListing; score?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{listing.projectName}</CardTitle>
            <div className="text-sm text-muted-foreground">{listing.standard} | {listing.location} | {listing.methodology}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline">{listing.category}</Badge>
            {score !== undefined && <Badge variant="secondary">Score {score}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>Indicative: {listing.indicativePricing.currency} {listing.indicativePricing.mid} ({listing.indicativePricing.rangeLow}-{listing.indicativePricing.rangeHigh})</div>
        <div>Vintages: {listing.vintages.join(", ")}</div>
        <div>Available: {listing.totalQty.toLocaleString()} | Min lot: {listing.minLot.toLocaleString()} | Settle: {listing.settlementWindow}</div>
        <div className="text-muted-foreground">Sellers: {listing.sellers.anonymizedCount} | KYC {listing.sellers.kycBadge ? "Yes" : "No"} | Inventory {listing.sellers.proofOfInventory}</div>
        <Link className="underline" href={`/trading/listings/${listing.id}`}>View listing</Link>
      </CardContent>
    </Card>
  );
}
