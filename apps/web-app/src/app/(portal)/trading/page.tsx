import { MarketplaceExplorer } from "@/components/trading/MarketplaceExplorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listListings } from "@/lib/trading/api";

export default async function TradingMarketplace() {
  const listings = await listListings();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Carbon Marketplace (RFQ OTC)</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Discovery</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Listings are ranked with a deterministic score based on proof-of-inventory, KYC badge, spread tightness, availability, and lot-size accessibility.</CardContent>
      </Card>

      <MarketplaceExplorer listings={listings} />
    </div>
  );
}
