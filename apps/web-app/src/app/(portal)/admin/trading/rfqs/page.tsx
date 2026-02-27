import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listRfqs } from "@/lib/trading/api";

export default async function AdminTradingRfqs() {
  const rfqs = await listRfqs();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin RFQ Oversight</h1>
      <Card><CardHeader><CardTitle className="text-base">RFQs</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Open RFQs: {rfqs.length}</CardContent></Card>
    </div>
  );
}
