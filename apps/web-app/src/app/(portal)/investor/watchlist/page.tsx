import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function InvestorWatchlist() {
  return (
    <FigmaPage title="Watchlist" subtitle="Track saved projects and alert-driven readiness changes.">
      <FigmaStatGrid
        stats={[
          { key: "saved", label: "Saved Projects", value: "0" },
          { key: "alerts", label: "Active Alerts", value: "0" },
          { key: "updates", label: "Unread Updates", value: "0" },
          { key: "sync", label: "Sync Status", value: "Live" },
        ]}
      />
      <FigmaPanel title="Saved Projects" subtitle="Bookmark and alert workflows for mandate-matching projects.">
        <div className="text-sm text-white/75">Allow bookmark and alert workflows when readiness or document state changes.</div>
      </FigmaPanel>
    </FigmaPage>
  );
}
