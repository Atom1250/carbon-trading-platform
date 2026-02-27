"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type Snapshot = {
  openTasks: number;
  criticalTasks: number;
  slaBreaches: number;
};

export function AdminLiveBadges({ pollMs = 30000 }: { pollMs?: number }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const [dashboardRes] = await Promise.all([fetch("/api/admin/dashboard", { cache: "no-store" })]);
      const dashboard = await dashboardRes.json();
      if (!mounted) return;
      setSnapshot({
        openTasks: dashboard.kpis.openTasks,
        criticalTasks: dashboard.kpis.criticalTasks,
        slaBreaches: dashboard.kpis.slaBreaches,
      });
      setUpdatedAt(dashboard.polledAt);
    };

    void refresh();
    const id = setInterval(() => void refresh(), pollMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [pollMs]);

  if (!snapshot) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge variant="outline">Open tasks {snapshot.openTasks}</Badge>
      <Badge variant={snapshot.criticalTasks > 0 ? "destructive" : "outline"}>Critical {snapshot.criticalTasks}</Badge>
      <Badge variant={snapshot.slaBreaches > 0 ? "destructive" : "secondary"}>SLA breaches {snapshot.slaBreaches}</Badge>
      <span className="text-muted-foreground">Live {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "-"}</span>
    </div>
  );
}
