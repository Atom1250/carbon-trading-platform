import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminTradingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Trading Dashboard</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Oversight</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div><Link className="underline" href="/admin/dashboard">Unified dashboard</Link></div>
          <div><Link className="underline" href="/admin/tasks">Task engine</Link></div>
          <div><Link className="underline" href="/admin/risk">Risk dashboard</Link></div>
          <div><Link className="underline" href="/admin/sla">SLA monitor</Link></div>
          <div><Link className="underline" href="/admin/trading/rfqs">RFQ oversight</Link></div>
          <div><Link className="underline" href="/admin/trading/trades">Trade oversight</Link></div>
          <div><Link className="underline" href="/admin/disputes">Dispute handling</Link></div>
          <div><Link className="underline" href="/admin/documents">Document control</Link></div>
          <div><Link className="underline" href="/admin/trading/policies">Policies</Link></div>
        </CardContent>
      </Card>
    </div>
  );
}
