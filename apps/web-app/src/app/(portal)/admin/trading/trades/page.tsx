import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listTrades } from "@/lib/trading/api";

export default async function AdminTradingTrades() {
  const trades = await listTrades();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Trade Oversight</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Trades</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((t) => (
                <TableRow key={t.id}>
                  <TableCell><Link className="underline" href={`/admin/trading/trades/${t.id}`}>{t.id}</Link></TableCell>
                  <TableCell>{t.counterparty}</TableCell>
                  <TableCell>{t.settlementStage}</TableCell>
                  <TableCell><Badge variant={t.status === "SETTLED" ? "secondary" : t.status === "FAILED" ? "destructive" : "outline"}>{t.status}</Badge></TableCell>
                  <TableCell>{t.updatedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
