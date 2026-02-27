"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/nav/SidebarNav";
import { CommandPalette } from "@/components/nav/CommandPalette";
import type { CurrentUser } from "@/lib/user/types";

export function PortalShell({ children, user }: { children: ReactNode; user: CurrentUser }) {
  const pathname = usePathname();

  const titleByPath: Array<{ match: (path: string) => boolean; label: string }> = [
    { match: (path) => path.startsWith("/admin"), label: "Admin Command Centre" },
    { match: (path) => path.startsWith("/trading"), label: "Carbon Trading Portal" },
    { match: (path) => path.startsWith("/investor"), label: "Investor Portal" },
    { match: (path) => path.startsWith("/owner"), label: "Project Owner Portal" },
    { match: (path) => path.startsWith("/onboarding"), label: "Onboarding" },
    { match: (path) => path.startsWith("/dashboard"), label: "Unified Dashboard" },
  ];

  const pageLabel = titleByPath.find((item) => item.match(pathname))?.label ?? "Platform";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <SidebarNav user={user} pathname={pathname} />
        <CommandPalette user={user} />

        <main className="flex-1">
          <header className="flex h-14 items-center justify-between border-b px-6">
            <div className="text-sm text-muted-foreground">{pageLabel}</div>
            <div className="text-sm text-muted-foreground">
              Persona: <span className="font-medium text-foreground">{user.persona}</span>
            </div>
          </header>

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
