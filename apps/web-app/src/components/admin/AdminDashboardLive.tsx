"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLiveBadges } from "@/components/admin/AdminLiveBadges";

type DashboardData = {
  kpis: {
    openTasks: number;
    criticalTasks: number;
    highRiskCases: number;
    blockedSettlements: number;
    slaBreaches: number;
  };
  highPriorityTasks: Array<{ id: string; title: string; priority: string }>;
  riskAlerts: Array<{ id: string; title: string; objectType: string; objectId: string; riskScore: number }>;
  settlementBlockages: Array<{ id: string; objectId: string; title: string }>;
  breaches: Array<{ id: string; title: string; slaDeadline: string }>;
  polledAt?: string;
};

export function AdminDashboardLive({ initialData, pollMs = 30000 }: { initialData: DashboardData; pollMs?: number }) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const next = (await res.json()) as DashboardData;
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
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <AdminLiveBadges pollMs={pollMs} />
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-5">
        <Card><CardHeader><CardTitle className="text-sm">Open Tasks</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.kpis.openTasks}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Critical Tasks</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.kpis.criticalTasks}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">High Risk</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.kpis.highRiskCases}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Settlement Blockage</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.kpis.blockedSettlements}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">SLA Breaches</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.kpis.slaBreaches}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Risk Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.riskAlerts.map((a) => (
              <div key={a.id} className="rounded-md border p-2">{a.title} | {a.objectType} {a.objectId} | Risk {a.riskScore}</div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">SLA Breaches</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.breaches.length === 0 && <div className="text-muted-foreground">No SLA breaches.</div>}
            {data.breaches.map((b) => (
              <div key={b.id} className="rounded-md border p-2">{b.title} | overdue by {Math.max(1, Math.round((Date.now() - new Date(b.slaDeadline).getTime()) / (1000 * 60 * 60)))}h</div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">High Priority Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.highPriorityTasks.map((t) => (
              <div key={t.id} className="rounded-md border p-2">{t.title} | {t.priority} | <Link className="underline" href="/admin/tasks">open task engine</Link></div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Settlement Blockage Monitor</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.settlementBlockages.length === 0 && <div className="text-muted-foreground">No blocked settlement tasks.</div>}
            {data.settlementBlockages.map((s) => (
              <div key={s.id} className="rounded-md border p-2">{s.objectId} | {s.title} | <Link className="underline" href={`/admin/trading/trades/${s.objectId}`}>open oversight</Link></div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
