"use client";

import { useEffect, useState } from "react";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getInvestorMandate, saveInvestorMandate } from "@/lib/investor/api";
import type { InvestorMandate } from "@/lib/investor/types";
import { InvestorMandateSchema } from "@/lib/validation/investor/schemas";

export default function MandatePage() {
  const [m, setM] = useState<InvestorMandate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => setM(await getInvestorMandate()))();
  }, []);

  if (!m) return <div className="text-sm text-muted-foreground">Loading...</div>;

  async function onSave() {
    if (!m) return;

    setError(null);
    const parsed = InvestorMandateSchema.safeParse(m);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" | "));
      return;
    }

    setSaving(true);
    try {
      await saveInvestorMandate(m);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FigmaPage title="Investment Mandate" subtitle="Mandate controls for deterministic ranking and search behavior.">
      <FigmaStatGrid
        stats={[
          { key: "categories", label: "Categories", value: String(m.categories.length) },
          { key: "stages", label: "Stages", value: String(m.stagesAllowed.length) },
          { key: "instruments", label: "Instruments", value: String(m.instruments.length) },
          { key: "saving", label: "Save Status", value: saving ? "Saving" : "Ready" },
        ]}
      />

      {error && <div className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</div>}

      <FigmaPanel title="Mandate Settings (Foundation)" subtitle="Current editable mandate parameters and ranking weights.">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Categories (CSV for now)</Label>
            <Input value={m.categories.join(",")} onChange={(e) => setM({ ...m, categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) as any })} />
          </div>

          <div className="space-y-2">
            <Label>Stages allowed (CSV)</Label>
            <Input value={m.stagesAllowed.join(",")} onChange={(e) => setM({ ...m, stagesAllowed: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) as any })} />
          </div>

          <div className="space-y-2">
            <Label>Instruments (CSV)</Label>
            <Input value={m.instruments.join(",")} onChange={(e) => setM({ ...m, instruments: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) as any })} />
          </div>

          <div className="space-y-2">
            <Label>Ranking weights (must sum to 1.0)</Label>
            <Textarea
              value={JSON.stringify(m.weights, null, 2)}
              onChange={(e) => {
                try {
                  const w = JSON.parse(e.target.value);
                  setM({ ...m, weights: w });
                } catch {}
              }}
              className="font-mono text-xs"
            />
          </div>

          <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save mandate"}</Button>

          <div className="text-sm text-muted-foreground">Replace CSV/JSON fields with multi-selects, ranges, and sliders in next pass.</div>
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
