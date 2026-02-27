"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminTask } from "@/lib/admin/types";
import { AdminLiveBadges } from "@/components/admin/AdminLiveBadges";

type LocalTask = AdminTask & { selected?: boolean };

function isSlaRisk(task: AdminTask) {
  return new Date(task.slaDeadline).getTime() < Date.now() || task.riskScore >= 75;
}

export function TaskEngineClient({ initialTasks }: { initialTasks: AdminTask[] }) {
  const [tasks, setTasks] = useState<LocalTask[]>(initialTasks);
  const [typeFilter, setTypeFilter] = useState("");
  const [slaRiskOnly, setSlaRiskOnly] = useState(false);
  const [bulkAdmin, setBulkAdmin] = useState("admin_ops");
  const [polledAt, setPolledAt] = useState<string>("");

  const filtered = useMemo(
    () =>
      tasks
        .filter((t) => (typeFilter ? t.objectType === typeFilter : true))
        .filter((t) => (slaRiskOnly ? isSlaRisk(t) : true))
        .sort((a, b) => b.riskScore - a.riskScore),
    [tasks, typeFilter, slaRiskOnly]
  );

  function toggleSelect(taskId: string) {
    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, selected: !t.selected } : t)));
  }

  function bulkAssign() {
    const selectedIds = tasks.filter((t) => t.selected).map((t) => t.id);
    void fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "bulkAssign", taskIds: selectedIds, assignedAdmin: bulkAdmin }),
    }).then(async () => {
      const res = await fetch("/api/admin/tasks", { cache: "no-store" });
      const payload = await res.json();
      setTasks(payload.tasks);
      setPolledAt(payload.polledAt ?? "");
    });
  }

  function setEscalation(taskId: string, flag: boolean) {
    void fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "updateTask", taskId, escalationFlag: flag }),
    }).then(async () => {
      const res = await fetch("/api/admin/tasks", { cache: "no-store" });
      const payload = await res.json();
      setTasks((prev) => payload.tasks.map((t: AdminTask) => ({ ...t, selected: prev.find((p) => p.id === t.id)?.selected })));
      setPolledAt(payload.polledAt ?? "");
    });
  }

  function setStatus(taskId: string, status: AdminTask["status"]) {
    void fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "updateTask", taskId, status }),
    }).then(async () => {
      const res = await fetch("/api/admin/tasks", { cache: "no-store" });
      const payload = await res.json();
      setTasks((prev) => payload.tasks.map((t: AdminTask) => ({ ...t, selected: prev.find((p) => p.id === t.id)?.selected })));
      setPolledAt(payload.polledAt ?? "");
    });
  }

  const selectedCount = tasks.filter((t) => t.selected).length;

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch("/api/admin/tasks", { cache: "no-store" });
      const payload = await res.json();
      setTasks((prev) => payload.tasks.map((t: AdminTask) => ({ ...t, selected: prev.find((p) => p.id === t.id)?.selected })));
      setPolledAt(payload.polledAt ?? "");
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Unified Task Engine</h1>
        <AdminLiveBadges pollMs={30000} />
      </div>
      <div className="text-xs text-muted-foreground">Live polling every 30s{polledAt ? ` | last sync ${new Date(polledAt).toLocaleTimeString()}` : ""}</div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters & Bulk Actions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Object type</div>
            <select className="h-10 w-full rounded-md border border-border bg-background px-3" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All</option>
              <option value="ONBOARDING">ONBOARDING</option>
              <option value="PROJECT">PROJECT</option>
              <option value="RFQ">RFQ</option>
              <option value="TRADE">TRADE</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <div className="text-muted-foreground">Bulk assign admin</div>
            <Input value={bulkAdmin} onChange={(e) => setBulkAdmin(e.target.value)} />
          </label>

          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={slaRiskOnly} onChange={(e) => setSlaRiskOnly(e.target.checked)} />
            SLA risk only
          </label>

          <div className="md:pt-6">
            <Button onClick={bulkAssign} disabled={selectedCount === 0}>Bulk assign ({selectedCount})</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tasks</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {filtered.map((t) => (
            <div key={t.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!t.selected} onChange={() => toggleSelect(t.id)} />
                  <span className="font-medium">{t.title}</span>
                </label>
                <div className="flex gap-2">
                  <Badge variant={t.priority === "CRITICAL" ? "destructive" : t.priority === "HIGH" ? "secondary" : "outline"}>{t.priority}</Badge>
                  <Badge variant="outline">Risk {t.riskScore}</Badge>
                  <Badge variant={isSlaRisk(t) ? "destructive" : "outline"}>{isSlaRisk(t) ? "SLA RISK" : "ON TRACK"}</Badge>
                </div>
              </div>

              <div className="text-muted-foreground">{t.objectType} | {t.objectId} | Assigned: {t.assignedAdmin ?? "Unassigned"} | Deadline: {t.slaDeadline}</div>

              <div className="flex flex-wrap items-center gap-2">
                <select className="h-9 rounded-md border border-border bg-background px-2" value={t.status} onChange={(e) => setStatus(t.id, e.target.value as AdminTask["status"])}>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="COMPLETE">COMPLETE</option>
                </select>
                <Button size="sm" variant={t.escalationFlag ? "destructive" : "outline"} onClick={() => setEscalation(t.id, !t.escalationFlag)}>
                  {t.escalationFlag ? "Escalated" : "Escalate"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
