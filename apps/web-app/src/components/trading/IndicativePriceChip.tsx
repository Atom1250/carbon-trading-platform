import { Badge } from "@/components/ui/badge";

export function IndicativePriceChip({ mid, low, high, currency, updatedAt }: { mid: number; low: number; high: number; currency: string; updatedAt?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant="secondary">{currency} {mid}</Badge>
      <span className="text-muted-foreground">{low}-{high}</span>
      {updatedAt && <span className="text-muted-foreground">upd {new Date(updatedAt).toLocaleTimeString()}</span>}
    </div>
  );
}
