"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateMilestone } from "@/lib/trading/api";
import type { SettlementMilestone, Trade } from "@/lib/trading/types";

export function TradeSettlementConsole({ trade, initialMilestones }: { trade: Trade; initialMilestones: SettlementMilestone[] }) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [evidenceName, setEvidenceName] = useState<Record<string, string>>({});
  const [comment, setComment] = useState<Record<string, string>>({});

  async function apply(id: string, status: "PENDING" | "DONE" | "BLOCKED", adminOverride?: boolean) {
    const updated = await updateMilestone(id, {
      status,
      evidenceName: evidenceName[id],
      comment: comment[id],
      adminOverride,
      updatedBy: adminOverride ? "admin" : "trader",
    });
    if (!updated) return;
    setMilestones((current) => current.map((m) => (m.id === id ? updated : m)));
  }

  const nextAction = milestones.find((m) => m.status !== "DONE");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Trade Summary</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>Trade: {trade.id}</div>
          <div>Executed: {trade.executedQty.toLocaleString()} @ {trade.currency} {trade.executedPrice}</div>
          <div>Counterparty: {trade.counterparty}</div>
          <div>Current stage: {trade.settlementStage}</div>
          <div>Status: {trade.status}</div>
          <div className="pt-2 text-muted-foreground">Next action: {nextAction ? nextAction.type : "All milestones complete"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">DvP Settlement Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {milestones.map((m) => (
            <div key={m.id} className="space-y-2 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{m.type}</div>
                <Badge variant={m.status === "DONE" ? "secondary" : m.status === "BLOCKED" ? "destructive" : "outline"}>{m.status}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Input placeholder="Evidence file name" value={evidenceName[m.id] ?? ""} onChange={(e) => setEvidenceName((s) => ({ ...s, [m.id]: e.target.value }))} />
                <Input placeholder="Comment" value={comment[m.id] ?? ""} onChange={(e) => setComment((s) => ({ ...s, [m.id]: e.target.value }))} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => apply(m.id, "DONE")}>Mark Done</Button>
                <Button size="sm" variant="outline" onClick={() => apply(m.id, "PENDING")}>Set Pending</Button>
                <Button size="sm" variant="destructive" onClick={() => apply(m.id, "BLOCKED")}>Block</Button>
                <Button size="sm" variant="secondary" onClick={() => apply(m.id, "DONE", true)}>Admin Override Done</Button>
              </div>
              {m.evidence && m.evidence.length > 0 && (
                <div className="text-xs text-muted-foreground">Evidence: {m.evidence.map((e) => e.name).join(", ")}</div>
              )}
              <div className="text-xs text-muted-foreground">Updated by {m.updatedBy} at {m.updatedAt}{m.adminOverride ? " (admin override)" : ""}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
