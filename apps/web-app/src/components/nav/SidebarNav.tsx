import Link from "next/link";
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
    <aside className="min-h-screen w-72 border-r bg-sidebar p-4 text-sidebar-foreground">
      <div className="mb-6">
        <div className="text-lg font-semibold">Carbon Platform</div>
        <div className="text-sm text-muted-foreground">
          {user.orgName ?? "-"} • {user.persona}
        </div>
      </div>

      <div className="space-y-6">
        {NAV_SECTIONS.map((sec) => (
          <div key={sec.key} className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{sec.label}</div>
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
                      "block rounded-md px-3 py-2 hover:bg-sidebar-accent/60",
                      isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{it.label}</div>
                        {it.description && <div className="truncate text-xs text-muted-foreground">{it.description}</div>}
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
