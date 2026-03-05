import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function AdminTradingDisputes() {
  return (
    <FigmaPage title="Trading Disputes" subtitle="Escalation queue, ownership, and resolution tracking.">
      <FigmaStatGrid
        stats={[
          { key: "open", label: "Open Disputes", value: "6" },
          { key: "escalated", label: "Escalated", value: "2" },
          { key: "sla", label: "SLA At Risk", value: "1" },
          { key: "resolved", label: "Resolved (7d)", value: "9" },
        ]}
      />

      <FigmaPanel title="Active Escalations" subtitle="Highest priority disputes requiring admin action.">
        <div className="space-y-2">
          <FigmaListItem title="TRD-3921 | Counterparty settlement delay" meta="Severity High | Owner: Ops" body="Awaiting documentary evidence and milestone override rationale." />
          <FigmaListItem title="TRD-3908 | Quantity mismatch" meta="Severity Medium | Owner: Legal" body="Counterparty proposed amendment under review." />
          <FigmaListItem title="TRD-3897 | Registry transfer exception" meta="Severity Medium | Owner: Trading" body="Pending registry acknowledgement." />
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
