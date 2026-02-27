"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Trade } from "@/lib/trading/types";

export function TradesBlotterClient({ trades }: { trades: Trade[] }) {
  const [status, setStatus] = useState("");
  const [stage, setStage] = useState("");
  const [counterparty, setCounterparty] = useState("");

  const filtered = useMemo(
    () =>
      trades
        .filter((t) => (status ? t.status === status : true))
        .filter((t) => (stage ? t.settlementStage === stage : true))
        .filter((t) => (counterparty ? t.counterparty.toLowerCase().includes(counterparty.toLowerCase()) : true))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [stage, status, trades, counterparty]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Trades Blotter</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Trade Status</div>
            <select className="h-10 w-full rounded-md border border-border bg-background px-3" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="AGREED">AGREED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="SETTLEMENT_IN_PROGRESS">SETTLEMENT_IN_PROGRESS</option>
              <option value="SETTLED">SETTLED</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Settlement Stage</div>
            <select className="h-10 w-full rounded-md border border-border bg-background px-3" value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">All</option>
              <option value="CASH">CASH</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="COMPLETE">COMPLETE</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Counterparty</div>
            <Input placeholder="seller id" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Trades</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade</TableHead>
                <TableHead>RFQ</TableHead>
                <TableHead>Executed</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell><Link className="underline" href={`/trading/trades/${t.id}`}>{t.id}</Link></TableCell>
                  <TableCell>{t.rfqId}</TableCell>
                  <TableCell>{t.executedQty.toLocaleString()} @ {t.currency} {t.executedPrice}</TableCell>
                  <TableCell>{t.counterparty}</TableCell>
                  <TableCell>{t.settlementStage}</TableCell>
                  <TableCell><Badge variant={t.status === "SETTLED" ? "secondary" : t.status === "FAILED" ? "destructive" : "outline"}>{t.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
