import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function OwnerTasksPage() {
  return (
    <FigmaPage title="Owner Tasks" subtitle="Readiness checklist and operational task sequencing.">
      <FigmaStatGrid
        stats={[
          { key: "open", label: "Open Tasks", value: "11" },
          { key: "critical", label: "Critical", value: "2" },
          { key: "due", label: "Due This Week", value: "5" },
          { key: "done", label: "Completed (30d)", value: "36" },
        ]}
      />

      <FigmaPanel title="Priority Queue" subtitle="Highest-impact tasks for investor readiness.">
        <div className="space-y-2">
          <FigmaListItem title="Upload audited financials" meta="Critical | Due today" body="Required for investor underwriting unlock." />
          <FigmaListItem title="Resolve land-rights verification" meta="Critical | Due tomorrow" body="Legal review blocked pending jurisdiction note." />
          <FigmaListItem title="Publish updated carbon issuance schedule" meta="Normal | Due in 3 days" body="Align schedule with latest methodology revision." />
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
