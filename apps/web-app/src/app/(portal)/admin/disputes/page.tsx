import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { getDisputes } from "@/lib/admin/api";

export default async function AdminDisputesPage() {
  const disputes = await getDisputes();
  const openCount = disputes.filter((d) => d.resolutionStatus === "OPEN" || d.resolutionStatus === "UNDER_REVIEW").length;
  const escalatedCount = disputes.filter((d) => d.resolutionStatus === "ESCALATED").length;
  const resolvedCount = disputes.filter((d) => d.resolutionStatus === "RESOLVED").length;

  return (
    <FigmaPage title="Dispute Handling" subtitle="Track, escalate, and resolve settlement and trade disputes.">
      <FigmaStatGrid
        stats={[
          { key: "total", label: "Total Disputes", value: String(disputes.length) },
          { key: "open", label: "Open/Review", value: String(openCount) },
          { key: "escalated", label: "Escalated", value: String(escalatedCount) },
          { key: "resolved", label: "Resolved", value: String(resolvedCount) },
        ]}
      />
      <FigmaPanel title="Disputes" subtitle="Operational dispute queue and escalation trail.">
        <div className="space-y-3 text-sm">
          {disputes.map((d) => (
            <div key={d.id} className="rounded-xl border border-white/10 bg-[#071326] p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-white">{d.id} | Trade {d.tradeId}</div>
                <Badge variant={d.resolutionStatus === "ESCALATED" ? "destructive" : d.resolutionStatus === "RESOLVED" ? "secondary" : "outline"}>{d.resolutionStatus}</Badge>
              </div>
              <div className="mt-2">
                <FigmaListItem
                  title="Dispute Summary"
                  body={d.disputeReason}
                  meta={`Evidence: ${d.evidence.join(", ")}${d.escalationNotes ? ` | Escalation: ${d.escalationNotes}` : ""}`}
                />
              </div>
              <div className="pt-1">
                <Link className="text-sm underline" href={`/admin/trading/trades/${d.tradeId}`}>
                  Open trade oversight
                </Link>
              </div>
            </div>
          ))}
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
