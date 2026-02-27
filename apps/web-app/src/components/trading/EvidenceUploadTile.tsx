"use client";

import { Input } from "@/components/ui/input";

export function EvidenceUploadTile({ onChange }: { onChange?: (name: string) => void }) {
  return <Input placeholder="Evidence file name" onChange={(e) => onChange?.(e.target.value)} />;
}
