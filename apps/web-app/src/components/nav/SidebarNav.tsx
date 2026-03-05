import Link from "next/link";
import { Leaf } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/nav/config";
import type { CurrentUser } from "@/lib/user/types";
import type { NavVisibility } from "@/lib/nav/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function GateBadge({ v }: { v: NavVisibility }) {
  if (v === "GATED") return <Badge variant="outline">Request access</Badge>;
  return null;
}

export function SidebarNav({ user, pathname }: { user: CurrentUser; pathname: string }) {
  return (
    <aside className="min-h-screen w-80 border-r border-white/10 bg-[#060f1e]/90 p-5 text-white backdrop-blur-xl">
      <div className="mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/20">
            <Leaf className="h-4 w-4 text-emerald-400" />
          </span>
          <span>
            <span className="text-emerald-400">Earth</span>
            <span className="text-white/90">1.one</span>
          </span>
        </div>
        <div className="mt-2 text-sm text-white/60">
          {user.orgName ?? "-"} • {user.persona}
        </div>
      </div>

      <div className="space-y-6">
        {NAV_SECTIONS.map((sec) => (
          <div key={sec.key} className="space-y-2">
            <div className="text-xs uppercase tracking-[0.14em] text-white/50">{sec.label}</div>
            <div className="space-y-1">
              {sec.items.map((it) => {
                const vis = it.visibilityByPersona[user.persona];
                if (vis === "HIDDEN") return null;

                const href = vis === "GATED" ? "/onboarding/start" : (it.href ?? "#");
                const isActive = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={it.key}
                    href={href}
                    className={cn(
                      "block rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/10",
                      isActive && "border-emerald-500/50 bg-emerald-500/15 text-white"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{it.label}</div>
                        {it.description && <div className="truncate text-xs text-white/50">{it.description}</div>}
                      </div>
                      <GateBadge v={vis} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
