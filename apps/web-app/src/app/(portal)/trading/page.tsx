import { MarketplaceExplorer } from "@/components/trading/MarketplaceExplorer";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { listListings } from "@/lib/trading/api";
import { getTradingMarketplaceSnapshot } from "@/lib/api/portal";

export default async function TradingMarketplace() {
  const [listings, snapshot] = await Promise.all([listListings(), getTradingMarketplaceSnapshot()]);

  return (
    <FigmaPage title="Carbon Marketplace (RFQ OTC)" subtitle="Explore listings and initiate RFQ execution flows.">
      <FigmaStatGrid
        stats={[
          { key: "listings", label: "Listings", value: String(snapshot.kpis.listings) },
          { key: "removals", label: "Removals", value: String(snapshot.kpis.removals) },
          { key: "avoidance", label: "Avoidance", value: String(snapshot.kpis.avoidance) },
          { key: "price", label: "Avg Price", value: snapshot.kpis.avgIndicativePrice.toFixed(2) },
        ]}
      />

      <FigmaPanel title="Discovery" subtitle="Deterministic ranking based on inventory proof, KYC signals, spread, and lot accessibility.">
        <div className="space-y-2 text-sm text-white/75">
          <div>Listings are ranked with a deterministic score based on proof-of-inventory, KYC badge, spread tightness, availability, and lot-size accessibility.</div>
          <div>
            {snapshot.kpis.listings} listings • {snapshot.kpis.removals} removals • {snapshot.kpis.avoidance} avoidance • Avg price {snapshot.kpis.avgIndicativePrice.toFixed(2)}
          </div>
        </div>
      </FigmaPanel>

      <MarketplaceExplorer listings={listings} />
    </FigmaPage>
  );
}
