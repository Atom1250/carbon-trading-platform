import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminTradingPolicies() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Trading Policies</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Policy configuration</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">RFQ templates, required fields, and settlement rules configuration placeholder.</CardContent>
      </Card>
    </div>
  );
}
