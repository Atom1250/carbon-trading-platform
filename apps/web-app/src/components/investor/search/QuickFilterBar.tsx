"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function QuickFilterBar({
  onChange,
}: {
  onChange: (q: { category?: string; country?: string; stage?: string; ndaFreeOnly?: boolean; creditsOnly?: boolean }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <Select onValueChange={(v) => onChange({ category: v })}>
        <SelectTrigger className="w-56"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="RENEWABLE_ENERGY">Renewable Energy</SelectItem>
          <SelectItem value="GREEN_INFRASTRUCTURE">Green Infrastructure</SelectItem>
          <SelectItem value="BIODIVERSITY">Biodiversity</SelectItem>
        </SelectContent>
      </Select>

      <Select onValueChange={(v) => onChange({ stage: v })}>
        <SelectTrigger className="w-56"><SelectValue placeholder="Stage" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="FEASIBILITY">Feasibility</SelectItem>
          <SelectItem value="PERMITTED">Permitted</SelectItem>
          <SelectItem value="READY_TO_BUILD">Ready-to-Build</SelectItem>
          <SelectItem value="CONSTRUCTION">Construction</SelectItem>
          <SelectItem value="OPERATING">Operating</SelectItem>
        </SelectContent>
      </Select>

      <Select onValueChange={(v) => onChange({ country: v })}>
        <SelectTrigger className="w-56"><SelectValue placeholder="Country" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Portugal">Portugal</SelectItem>
          <SelectItem value="Mozambique">Mozambique</SelectItem>
          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <Switch id="creditsOnly" onCheckedChange={(v) => onChange({ creditsOnly: v })} />
        <Label htmlFor="creditsOnly">Credits only</Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="ndaFreeOnly" onCheckedChange={(v) => onChange({ ndaFreeOnly: v })} />
        <Label htmlFor="ndaFreeOnly">NDA-free only</Label>
      </div>
    </div>
  );
}
