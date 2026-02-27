"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FilterDrawerAdvanced() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Advanced Filters</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">Use this container for expanded RFQ marketplace criteria (economics, delivery, risk, compliance).</CardContent>
    </Card>
  );
}
