"use client";

import { cn } from "@/lib/utils";

export type Step = { key: string; label: string; status: "DONE" | "ACTIVE" | "TODO" | "BLOCKED" };

export function OnboardingStepper({ steps }: { steps: Step[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((s) => (
        <div
          key={s.key}
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            s.status === "ACTIVE" && "bg-muted font-medium",
            s.status === "DONE" && "border-muted-foreground/30",
            s.status === "BLOCKED" && "border-destructive text-destructive"
          )}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}
