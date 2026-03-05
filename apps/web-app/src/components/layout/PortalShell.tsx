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
    { match: (path) => path.startsWith("/project-owner"), label: "Project Owner Portal" },
    { match: (path) => path.startsWith("/owner"), label: "Project Owner Portal" },
    { match: (path) => path.startsWith("/onboarding"), label: "Onboarding" },
    { match: (path) => path.startsWith("/dashboard"), label: "Unified Dashboard" },
  ];

  const pageLabel = titleByPath.find((item) => item.match(pathname))?.label ?? "Platform";

  return (
    <div className="min-h-screen bg-[#060f1e] text-white">
      <div className="flex">
        <SidebarNav user={user} pathname={pathname} />
        <CommandPalette user={user} />

        <main className="flex-1 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_45%),linear-gradient(180deg,#071225_0%,#060f1e_100%)]">
          <header className="flex h-16 items-center justify-between border-b border-white/10 px-6 backdrop-blur-md">
            <div className="text-sm tracking-wide text-white/65">{pageLabel}</div>
            <div className="text-sm text-white/65">
              Persona: <span className="font-medium text-emerald-300">{user.persona}</span>
            </div>
          </header>

          <div className="p-6 text-white [&_.bg-card]:bg-white/5 [&_.border]:border-white/10 [&_.text-foreground]:text-white [&_.text-muted-foreground]:text-white/65">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
