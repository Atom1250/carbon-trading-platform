"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createRfq } from "@/lib/trading/api";
import type { CreditListing } from "@/lib/trading/types";

const steps = ["Unit", "Quantity", "Attributes", "Settlement", "Review"];

export function RfqWizard({ prefilledListing }: { prefilledListing: CreditListing | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [qty, setQty] = useState(prefilledListing?.minLot ?? 1000);
  const [vintages, setVintages] = useState(prefilledListing?.vintages.join(",") ?? "2026");
  const [attrs, setAttrs] = useState("Corresponding adjustment preferred");
  const [deliveryWindow, setDeliveryWindow] = useState("Q3-2026");
  const [settlementDate, setSettlementDate] = useState("2026-08-15");
  const [notes, setNotes] = useState("");
  const [partialFillAllowed, setPartialFillAllowed] = useState(true);

  const vintageList = useMemo(() => vintages.split(",").map((v) => Number(v.trim())).filter((v) => !Number.isNaN(v)), [vintages]);
  const requiredAttributes = useMemo(() => attrs.split("\n").map((a) => a.trim()).filter(Boolean), [attrs]);

  async function submit() {
    setSending(true);
    try {
      const rfq = await createRfq({
        buyerOrgId: "inv_org_01",
        listingId: prefilledListing?.id,
        requestedQty: qty,
        acceptableVintages: vintageList,
        requiredAttributes,
        deliveryWindow,
        targetSettlementDate: settlementDate,
        partialFillAllowed,
        notes,
      });
      router.push(`/trading/rfq/${rfq.id}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <div key={s} className={`rounded-md border px-3 py-1.5 text-sm ${i === step ? "bg-muted font-medium" : "text-muted-foreground"}`}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{steps[step]}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {step === 0 && (
            <div className="space-y-2">
              <div>Selected unit: {prefilledListing ? `${prefilledListing.projectName} (${prefilledListing.standard})` : "Manual"}</div>
              <div className="text-muted-foreground">Start from listing detail for full prefill; manual mode supported as fallback.</div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <Label>Requested Quantity</Label>
                <Input type="number" value={qty} min={1} onChange={(e) => setQty(Number(e.target.value) || 0)} />
              </label>
              <label className="space-y-1">
                <Label>Acceptable Vintages (CSV)</Label>
                <Input value={vintages} onChange={(e) => setVintages(e.target.value)} />
              </label>
            </div>
          )}

          {step === 2 && (
            <label className="space-y-1 block">
              <Label>Required Attributes (one per line)</Label>
              <Textarea value={attrs} onChange={(e) => setAttrs(e.target.value)} />
            </label>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <Label>Delivery Window</Label>
                <Input value={deliveryWindow} onChange={(e) => setDeliveryWindow(e.target.value)} />
              </label>
              <label className="space-y-1">
                <Label>Target Settlement Date</Label>
                <Input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
              </label>
              <label className="space-y-1 block md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 md:col-span-2">
                <input type="checkbox" checked={partialFillAllowed} onChange={(e) => setPartialFillAllowed(e.target.checked)} />
                <span>Allow partial fill</span>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-1 text-sm">
              <div>Listing: {prefilledListing?.id ?? "manual"}</div>
              <div>Quantity: {qty.toLocaleString()}</div>
              <div>Vintages: {vintageList.join(", ") || "-"}</div>
              <div>Attributes: {requiredAttributes.join(" | ") || "-"}</div>
              <div>Delivery: {deliveryWindow}</div>
              <div>Settlement date: {settlementDate}</div>
              <div>Partial fill: {partialFillAllowed ? "Yes" : "No"}</div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < steps.length - 1 && <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>}
            {step === steps.length - 1 && <Button onClick={submit} disabled={sending || qty <= 0 || vintageList.length === 0}>{sending ? "Sending..." : "Send RFQ"}</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
