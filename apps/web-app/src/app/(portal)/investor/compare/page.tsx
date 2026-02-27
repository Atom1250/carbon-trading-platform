import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvestorCompare() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Compare Projects (placeholder)</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Compare 2-5 projects</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Implement compare table with standardized underwriting fields (terms, readiness, risk, carbon schedule).</CardContent>
      </Card>
    </div>
  );
}
