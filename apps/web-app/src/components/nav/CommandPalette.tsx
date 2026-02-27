"use client";

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import Link from "next/link";
import type { CurrentUser } from "@/lib/user/types";
import { NAV_SECTIONS } from "@/lib/nav/config";

type Item = { label: string; href: string; section: string };

export function CommandPalette({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (const sec of NAV_SECTIONS) {
      for (const it of sec.items) {
        const vis = it.visibilityByPersona[user.persona];
        if (vis === "HIDDEN") continue;
        out.push({
          label: it.label,
          href: vis === "GATED" ? "/onboarding/start" : (it.href ?? "/dashboard"),
          section: sec.label,
        });
      }
    }
    return out;
  }, [user.persona]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border bg-background shadow-xl">
        <Command>
          <div className="border-b p-3">
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search... (Projects, RFQs, Trades, Onboarding)"
              className="w-full bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>
          <Command.List className="max-h-96 overflow-auto">
            <Command.Empty className="p-4 text-sm text-muted-foreground">No results.</Command.Empty>
            {items.map((it) => (
              <Command.Item key={`${it.href}-${it.label}`} className="px-4 py-3 text-sm">
                <Link href={it.href} onClick={() => setOpen(false)} className="flex w-full items-center justify-between">
                  <span>{it.label}</span>
                  <span className="text-xs text-muted-foreground">{it.section}</span>
                </Link>
              </Command.Item>
            ))}
          </Command.List>
          <div className="flex justify-between border-t p-3 text-xs text-muted-foreground">
            <span>Tip: Ctrl/⌘ + K</span>
            <button className="hover:underline" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </Command>
      </div>
    </div>
  );
}
