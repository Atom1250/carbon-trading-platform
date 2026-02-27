"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CaseStatus, RiskRating } from "@/lib/onboarding/types";

export function AdminDecisionBar({
  onSetStatus,
  onSetRisk,
}: {
  onSetStatus: (status: CaseStatus) => void;
  onSetRisk: (risk: RiskRating) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={(v) => onSetRisk(v as RiskRating)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Set risk rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">LOW</SelectItem>
            <SelectItem value="MEDIUM">MEDIUM</SelectItem>
            <SelectItem value="HIGH">HIGH</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => onSetStatus("ACTION_REQUIRED")}>Request Info</Button>
        <Button variant="outline" onClick={() => onSetStatus("CONDITIONAL_APPROVAL")}>Conditional</Button>
        <Button variant="destructive" onClick={() => onSetStatus("REJECTED")}>Reject</Button>
        <Button onClick={() => onSetStatus("APPROVED")}>Approve</Button>
      </div>
    </div>
  );
}
