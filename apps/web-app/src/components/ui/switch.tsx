"use client";

import { useId, useState } from "react";

type SwitchProps = {
  id?: string;
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch({ id, onCheckedChange }: SwitchProps) {
  const fallbackId = useId();
  const switchId = id ?? fallbackId;
  const [checked, setChecked] = useState(false);

  return (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        const next = !checked;
        setChecked(next);
        onCheckedChange?.(next);
      }}
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}
