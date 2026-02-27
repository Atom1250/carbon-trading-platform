"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SelectContextValue = {
  value: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

export function Select({
  children,
  onValueChange,
}: {
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const handleSetValue = React.useCallback(
    (next: string) => {
      setValue(next);
      onValueChange?.(next);
      setOpen(false);
    },
    [onValueChange]
  );

  return (
    <SelectContext.Provider value={{ value, setValue: handleSetValue, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        "inline-flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm",
        className
      )}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;
  return <span className={ctx.value ? "text-foreground" : "text-muted-foreground"}>{ctx.value || placeholder || "Select"}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext);
  if (!ctx || !ctx.open) return null;

  return <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background p-1 shadow-sm">{children}</div>;
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
    >
      {children}
    </button>
  );
}
