import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default async function OwnerProjectDetail({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return (
    <FigmaPage title={`Project ${projectId}`} subtitle="Project overview, readiness posture, and workflow checkpoints.">
      <FigmaStatGrid
        stats={[
          { key: "readiness", label: "Readiness", value: "72%" },
          { key: "docs", label: "Docs Completed", value: "18/24" },
          { key: "diligence", label: "Open Diligence", value: "4" },
          { key: "tasks", label: "Open Tasks", value: "7" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <FigmaPanel title="Project Overview" subtitle="Canonical summary for investor and admin views." className="xl:col-span-2">
          <div className="text-sm text-white/70">
            This container is aligned to Figma composition and reserved for snapshot, milestone timeline, access controls, and Q and A threading.
          </div>
        </FigmaPanel>
        <FigmaPanel title="Readiness Controls" subtitle="Checklist and blocker tracking">
          <div className="text-sm text-white/70">Wire readiness scoring and blocker drill-down from persisted checklist events.</div>
        </FigmaPanel>
      </div>
    </FigmaPage>
  );
}
