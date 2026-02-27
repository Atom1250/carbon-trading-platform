"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Quote } from "@/lib/trading/types";

type EnrichedQuote = Quote & { projectName?: string; standard?: string };

export function QuotesBlotterClient({ quotes }: { quotes: EnrichedQuote[] }) {
  const [status, setStatus] = useState("");
  const [rfq, setRfq] = useState("");
  const [project, setProject] = useState("");
  const [standard, setStandard] = useState("");
  const [expiringHours, setExpiringHours] = useState("");

  const filtered = useMemo(
    () =>
      quotes
        .filter((q) => (status ? q.status === status : true))
        .filter((q) => (rfq ? q.rfqId.includes(rfq) : true))
        .filter((q) => (project ? (q.projectName ?? "").toLowerCase().includes(project.toLowerCase()) : true))
        .filter((q) => (standard ? (q.standard ?? "") === standard : true))
        .filter((q) => {
          if (!expiringHours) return true;
          const hours = Number(expiringHours);
          if (Number.isNaN(hours)) return true;
          return new Date(q.validityUntil).getTime() - Date.now() <= hours * 60 * 60 * 1000;
        })
        .sort((a, b) => new Date(a.validityUntil).getTime() - new Date(b.validityUntil).getTime()),
    [quotes, rfq, status, project, standard, expiringHours]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Quotes Blotter</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Status</div>
            <select className="h-10 w-full rounded-md border border-border bg-background px-3" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="FIRM">FIRM</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <div className="text-muted-foreground">RFQ</div>
            <Input placeholder="rfq_..." value={rfq} onChange={(e) => setRfq(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Project</div>
            <Input placeholder="project name" value={project} onChange={(e) => setProject(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Standard</div>
            <select className="h-10 w-full rounded-md border border-border bg-background px-3" value={standard} onChange={(e) => setStandard(e.target.value)}>
              <option value="">All</option>
              <option value="VERRA">VERRA</option>
              <option value="Gold Standard">Gold Standard</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Expiring Within (hours)</div>
            <Input type="number" placeholder="e.g. 24" value={expiringHours} onChange={(e) => setExpiringHours(e.target.value)} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Quotes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>RFQ</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>{q.id}</TableCell>
                  <TableCell>{q.rfqId}</TableCell>
                  <TableCell>{q.projectName ?? "-"}</TableCell>
                  <TableCell>{q.standard ?? "-"}</TableCell>
                  <TableCell>{q.currency} {q.price}</TableCell>
                  <TableCell>{q.validityUntil}</TableCell>
                  <TableCell><Badge variant={q.status === "ACCEPTED" ? "secondary" : q.status === "REJECTED" ? "destructive" : "outline"}>{q.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
