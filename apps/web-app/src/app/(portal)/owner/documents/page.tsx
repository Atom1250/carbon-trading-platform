import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function OwnerDocumentsPage() {
  return (
    <FigmaPage title="Document Library" subtitle="Manage dataroom assets, visibility, and diligence readiness.">
      <FigmaStatGrid
        stats={[
          { key: "total", label: "Total Docs", value: "24" },
          { key: "dataroom", label: "In Dataroom", value: "12" },
          { key: "pending", label: "Pending Review", value: "5" },
          { key: "issues", label: "Flagged Issues", value: "2" },
        ]}
      />

      <FigmaPanel title="Latest Document Activity" subtitle="Most recent uploads and verification updates.">
        <div className="space-y-2">
          <FigmaListItem title="Feasibility Report v3" meta="Dataroom | Updated 2h ago" body="Marked investor-visible after policy check." />
          <FigmaListItem title="Land Rights Certificate" meta="Private | Updated 1d ago" body="Awaiting legal reviewer approval." />
          <FigmaListItem title="MRV Methodology Annex" meta="Public | Updated 3d ago" body="Version sync complete." />
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
