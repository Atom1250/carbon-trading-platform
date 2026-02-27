"use client";

import { Input } from "@/components/ui/input";

export function FilterBarQuick({ onSearch }: { onSearch?: (text: string) => void }) {
  return (
    <div className="rounded-md border p-3">
      <Input placeholder="Quick search by project, standard, country" onChange={(e) => onSearch?.(e.target.value)} />
    </div>
  );
}
