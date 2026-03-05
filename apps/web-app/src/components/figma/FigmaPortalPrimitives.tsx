import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FigmaPage({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/15 via-emerald-400/5 to-transparent px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
          </div>
          {right}
        </div>
      </div>
      {children}
    </div>
  );
}

export function FigmaPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-2xl border-white/10 bg-white/5 backdrop-blur-sm", className)}>
      <CardHeader>
        <CardTitle className="text-base text-white">{title}</CardTitle>
        {subtitle ? <div className="text-xs text-white/60">{subtitle}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function FigmaStatGrid({ stats }: { stats: Array<{ key: string; label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <div key={s.key} className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs uppercase tracking-wide text-white/55">{s.label}</div>
          <div className="mt-1 text-2xl font-semibold text-white">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export function FigmaListItem({ title, meta, body }: { title: string; meta?: string; body?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#071326] p-3">
      <div className="text-sm font-medium text-white">{title}</div>
      {meta ? <div className="text-xs text-white/55">{meta}</div> : null}
      {body ? <div className="mt-1 text-sm text-white/75">{body}</div> : null}
    </div>
  );
}
