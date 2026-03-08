import { Badge } from "@/components/ui/badge";
import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { getAdminTradeOversight } from "@/lib/admin/api";

export default async function AdminTradeOversight({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params;
  const data = await getAdminTradeOversight(tradeId);
  if (!data) return <div className="text-sm text-muted-foreground">Trade not found.</div>;

  return (
    <FigmaPage
      title={`Admin Trade Oversight: ${data.trade.id}`}
      subtitle="Settlement timeline control and blockage triage."
      right={<Badge variant={data.trade.status === "SETTLED" ? "secondary" : data.trade.status === "FAILED" ? "destructive" : "outline"}>{data.trade.status}</Badge>}
    >
      <FigmaStatGrid
        stats={[
          { key: "qty", label: "Executed Qty", value: data.trade.executedQty.toLocaleString() },
          { key: "price", label: "Executed Price", value: `${data.trade.currency} ${data.trade.executedPrice}` },
          { key: "pending", label: "Pending Milestones", value: String(data.pending) },
          { key: "counterparty", label: "Counterparty", value: data.trade.counterparty },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <FigmaPanel title="Settlement Summary" subtitle="Trade settlement and responsibility context.">
          <div className="space-y-1 text-sm text-white/75">
            <div>Counterparty: {data.trade.counterparty}</div>
            <div>Executed: {data.trade.executedQty.toLocaleString()} @ {data.trade.currency} {data.trade.executedPrice}</div>
            <div>Pending milestones: {data.pending}</div>
            <div>Counterparty responsibility: {data.counterpartyResponsibility}</div>
            <div className="pt-1 text-white/55">Use this panel to triage blockage ownership before escalation.</div>
          </div>
        </FigmaPanel>

        <FigmaPanel title="Blockage Indicator" subtitle="Current blocking milestone and audit context.">
          <div className="text-sm">
            {!data.blockage && <div className="text-white/60">No blocked milestones.</div>}
            {data.blockage && (
              <div className="space-y-1 rounded-md border border-white/10 bg-[#071326] p-2">
                <div className="font-medium text-white">Blocked at {data.blockage.type}</div>
                <div className="text-white/80">{data.blockage.comment ?? "No comment captured"}</div>
                <div className="text-white/55">Last updated by {data.blockage.updatedBy} at {data.blockage.updatedAt}</div>
              </div>
            )}
          </div>
        </FigmaPanel>
      </div>

      <FigmaPanel title="Settlement Timeline" subtitle="Milestone-by-milestone settlement progression.">
        <div className="space-y-2 text-sm">
          {data.timeline.map((m) => (
            <div key={m.id} className="rounded-md border border-white/10 bg-[#071326] p-2">
              <div className="flex items-center justify-between">
                <div className="text-white">{m.type}</div>
                <Badge variant={m.status === "DONE" ? "secondary" : m.status === "BLOCKED" ? "destructive" : "outline"}>{m.status}</Badge>
              </div>
              <FigmaListItem
                title={`Updated by ${m.updatedBy}`}
                meta={`${m.updatedAt}${m.adminOverride ? " | admin override" : ""}`}
                body={m.evidence && m.evidence.length > 0 ? `Evidence: ${m.evidence.map((e) => e.name).join(", ")}` : undefined}
              />
            </div>
          ))}
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
