"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createRetirementInstruction } from "@/lib/trading/api";
import type { PositionLot, RetirementInstruction } from "@/lib/trading/types";

export function RetirementsManager({ initialPositions, initialRetirements }: { initialPositions: PositionLot[]; initialRetirements: RetirementInstruction[] }) {
  const [positions, setPositions] = useState(initialPositions);
  const [retirements, setRetirements] = useState(initialRetirements);
  const [positionLotId, setPositionLotId] = useState(initialPositions[0]?.id ?? "");
  const [qty, setQty] = useState(1000);
  const [beneficiary, setBeneficiary] = useState("Default Beneficiary");
  const [claimText, setClaimText] = useState("Retirement for climate claim");
  const [evidence, setEvidence] = useState("");

  const selectedLot = useMemo(() => positions.find((p) => p.id === positionLotId), [positionLotId, positions]);

  async function submit() {
    if (!selectedLot || qty <= 0 || qty > selectedLot.qty) return;
    const created = await createRetirementInstruction({
      positionLotId,
      qty,
      beneficiary,
      claimText,
      evidence,
    });
    setRetirements((r) => [created, ...r]);
    setPositions((prev) => prev.map((p) => (p.id === selectedLot.id ? { ...p, qty: Math.max(0, p.qty - qty), status: p.qty - qty <= 0 ? "RETIRED" : "HELD" } : p)));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Create Retirement Instruction</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <div className="text-muted-foreground">Position lot</div>
            <select className="h-10 w-full rounded-md border border-border bg-background px-3" value={positionLotId} onChange={(e) => setPositionLotId(e.target.value)}>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.id} | {p.projectName} | {p.qty.toLocaleString()} | {p.status}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-muted-foreground">Quantity</div>
            <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} />
          </label>
          <label className="space-y-1">
            <div className="text-muted-foreground">Beneficiary</div>
            <Input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
          </label>
          <label className="space-y-1 md:col-span-2">
            <div className="text-muted-foreground">Claim text</div>
            <Input value={claimText} onChange={(e) => setClaimText(e.target.value)} />
          </label>
          <label className="space-y-1 md:col-span-2">
            <div className="text-muted-foreground">Evidence reference</div>
            <Input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="retirement-proof.pdf" />
          </label>

          <div className="md:col-span-2 flex items-center gap-2">
            <Button onClick={submit} disabled={!selectedLot || qty <= 0 || qty > (selectedLot?.qty ?? 0)}>Submit Retirement</Button>
            {selectedLot && <div className="text-xs text-muted-foreground">Available in selected lot: {selectedLot.qty.toLocaleString()}</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Retirement History</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {retirements.length === 0 && <div className="text-muted-foreground">No retirement instructions yet.</div>}
          {retirements.map((r) => (
            <div key={r.id} className="rounded-md border p-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.id}</div>
                <Badge variant="outline">{r.status}</Badge>
              </div>
              <div>Lot {r.positionLotId} | Qty {r.qty.toLocaleString()} | Beneficiary {r.beneficiary}</div>
              <div className="text-muted-foreground">{r.claimText}</div>
              <div className="text-muted-foreground">Evidence: {r.evidence || "-"}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
