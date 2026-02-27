"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RetirementForm({ onSubmit }: { onSubmit?: (input: { qty: number; beneficiary: string; claimText: string }) => void }) {
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        onSubmit?.({
          qty: Number(form.get("qty") || 0),
          beneficiary: String(form.get("beneficiary") || ""),
          claimText: String(form.get("claimText") || ""),
        });
      }}
    >
      <Input name="qty" type="number" placeholder="Quantity" />
      <Input name="beneficiary" placeholder="Beneficiary" />
      <Input name="claimText" placeholder="Claim text" />
      <Button type="submit">Submit retirement</Button>
    </form>
  );
}
