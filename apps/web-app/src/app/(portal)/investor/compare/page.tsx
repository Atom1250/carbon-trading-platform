import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function InvestorCompare() {
  return (
    <FigmaPage title="Compare Projects" subtitle="Side-by-side diligence and underwriting comparison.">
      <FigmaStatGrid
        stats={[
          { key: "selected", label: "Selected Projects", value: "3" },
          { key: "approved", label: "Approved Scenarios", value: "2" },
          { key: "watch", label: "Watchlist Overlap", value: "2" },
          { key: "risk", label: "Avg Risk Band", value: "B+" },
        ]}
      />

      <FigmaPanel title="Comparison Set" subtitle="Standardized summary of financing and carbon profile.">
        <div className="space-y-2">
          <FigmaListItem title="Mangrove Restoration - Delta Basin" meta="Ask USD 8.5M | Readiness 78%" body="Strong issuance trajectory, moderate permitting risk." />
          <FigmaListItem title="Agri-Soil Program - Midwest Cluster" meta="Ask USD 5.1M | Readiness 84%" body="Faster time-to-first issuance, stronger offtake coverage." />
          <FigmaListItem title="Cookstove Program - East Africa" meta="Ask USD 4.2M | Readiness 71%" body="High impact narrative, diligence requests still open." />
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
