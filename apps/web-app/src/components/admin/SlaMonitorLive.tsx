"use client";

import { useEffect, useState } from "react";
import { AdminLiveBadges } from "@/components/admin/AdminLiveBadges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SlaData = {
  metrics: Array<{ name: string; avgHours: number; targetHours: number }>;
  breaches: Array<{ id: string; objectType: string; objectId: string; owner: string; dueAt: string; overdueHours: number }>;
  polledAt?: string;
};

export function SlaMonitorLive({ initialData, pollMs = 30000 }: { initialData: SlaData; pollMs?: number }) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const res = await fetch("/api/admin/sla", { cache: "no-store" });
      const next = (await res.json()) as SlaData;
      if (mounted) setData(next);
    };
    const id = setInterval(() => void refresh(), pollMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">SLA Monitor</h1>
        <AdminLiveBadges pollMs={pollMs} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {data.metrics.map((m) => (
          <Card key={m.name}>
            <CardHeader><CardTitle className="text-sm">{m.name}</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div className="text-2xl font-semibold">{m.avgHours}h</div>
              <div className="text-muted-foreground">Target {m.targetHours}h</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">SLA Breaches</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Object</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Overdue (h)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.breaches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.objectType}</TableCell>
                  <TableCell>{b.objectId}</TableCell>
                  <TableCell>{b.owner}</TableCell>
                  <TableCell>{b.dueAt}</TableCell>
                  <TableCell>{b.overdueHours}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
