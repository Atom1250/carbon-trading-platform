import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function OwnerMessagesPage() {
  return (
    <FigmaPage title="Diligence Messages" subtitle="Investor Q and A threads, response SLAs, and issue escalation.">
      <FigmaStatGrid
        stats={[
          { key: "open", label: "Open Threads", value: "8" },
          { key: "due", label: "Due Today", value: "3" },
          { key: "resolved", label: "Resolved (7d)", value: "14" },
          { key: "sla", label: "SLA Breaches", value: "0" },
        ]}
      />

      <FigmaPanel title="Active Threads" subtitle="Sorted by urgency and investor impact.">
        <div className="space-y-2">
          <FigmaListItem title="Baseline methodology clarification" meta="Investor Alpha | Due in 4h" body="Provide supporting methodology appendix and verification references." />
          <FigmaListItem title="Offtake assumptions review" meta="Investor Delta | Due tomorrow" body="Share updated offtake sensitivity table for downside case." />
          <FigmaListItem title="Permitting timeline confirmation" meta="Investor Beta | Responded" body="Waiting for investor acknowledgement." />
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
