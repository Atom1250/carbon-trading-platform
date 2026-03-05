import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listTrades } from "@/lib/trading/api";

export default async function AdminTradingTrades() {
  const trades = await listTrades();
  const inProgress = trades.filter((trade) => trade.status === "SETTLEMENT_IN_PROGRESS" || trade.status === "CONFIRMED").length;
  const settled = trades.filter((trade) => trade.status === "SETTLED").length;
  const failed = trades.filter((trade) => trade.status === "FAILED").length;

  return (
    <FigmaPage title="Admin Trade Oversight" subtitle="Execution and settlement supervision across active trades.">
      <FigmaStatGrid
        stats={[
          { key: "total", label: "Total Trades", value: String(trades.length) },
          { key: "progress", label: "In Progress", value: String(inProgress) },
          { key: "settled", label: "Settled", value: String(settled) },
          { key: "failed", label: "Failed", value: String(failed) },
        ]}
      />
      <FigmaPanel title="Trades" subtitle="Operational trade queue with status and stage visibility.">
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
      </FigmaPanel>
    </FigmaPage>
  );
}
