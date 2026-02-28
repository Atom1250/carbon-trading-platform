import { MarketplaceExplorer } from "@/components/trading/MarketplaceExplorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listListings } from "@/lib/trading/api";
import { getTradingMarketplaceSnapshot } from "@/lib/api/portal";

export default async function TradingMarketplace() {
  const [listings, snapshot] = await Promise.all([listListings(), getTradingMarketplaceSnapshot()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Carbon Marketplace (RFQ OTC)</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Discovery</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>Listings are ranked with a deterministic score based on proof-of-inventory, KYC badge, spread tightness, availability, and lot-size accessibility.</div>
          <div>
            {snapshot.kpis.listings} listings • {snapshot.kpis.removals} removals • {snapshot.kpis.avoidance} avoidance • Avg price {snapshot.kpis.avgIndicativePrice.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <MarketplaceExplorer listings={listings} />
    </div>
  );
}
