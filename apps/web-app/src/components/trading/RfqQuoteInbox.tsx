"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptQuote } from "@/lib/trading/api";
import type { Quote, RFQ } from "@/lib/trading/types";

function expiresIn(validity: string) {
  const ms = new Date(validity).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hrs = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hrs}h ${mins}m`;
}

export function RfqQuoteInbox({ rfq, initialQuotes }: { rfq: RFQ; initialQuotes: Quote[] }) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [createdTradeId, setCreatedTradeId] = useState<string | null>(null);

  const statusVariant = useMemo(() => (rfq.status === "QUOTED" ? "secondary" : rfq.status === "EXPIRED" ? "destructive" : "outline"), [rfq.status]);

  async function onAccept(quoteId: string) {
    setAccepting(quoteId);
    try {
      const trade = await acceptQuote(quoteId);
      setQuotes((current) =>
        current.map((q) => {
          if (q.id === quoteId) return { ...q, status: "ACCEPTED" };
          if (q.status === "FIRM") return { ...q, status: "REJECTED" };
          return q;
        })
      );
      setCreatedTradeId(trade?.id ?? null);
    } finally {
      setAccepting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">RFQ {rfq.id}</h1>
        <Badge variant={statusVariant}>{rfq.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Status Banner</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Qty {rfq.requestedQty.toLocaleString()} | Vintages {rfq.acceptableVintages.join(", ")} | Delivery {rfq.deliveryWindow} | Target settle {rfq.targetSettlementDate}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Quote Inbox</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {quotes.length === 0 && <div className="text-muted-foreground">No quotes yet.</div>}
          {quotes.map((q) => (
            <div key={q.id} className="space-y-1 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{q.sellerId}</div>
                <Badge variant={q.status === "ACCEPTED" ? "secondary" : q.status === "REJECTED" ? "destructive" : "outline"}>{q.status}</Badge>
              </div>
              <div>Firm price: {q.currency} {q.price} + fees {q.fees}</div>
              <div className="text-muted-foreground">Valid for: {expiresIn(q.validityUntil)} ({q.validityUntil})</div>
              {q.status === "FIRM" && (
                <Button size="sm" onClick={() => onAccept(q.id)} disabled={accepting === q.id}>
                  {accepting === q.id ? "Accepting..." : "Accept Quote"}
                </Button>
              )}
            </div>
          ))}
          {createdTradeId && (
            <div className="rounded-md border border-secondary p-2">
              Trade created: <Link className="underline" href={`/trading/trades/${createdTradeId}`}>{createdTradeId}</Link>
            </div>
          )}
          <Link className="underline" href="/trading/quotes">Go to Quotes Blotter</Link>
        </CardContent>
      </Card>
    </div>
  );
}
