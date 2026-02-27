import { Badge } from "@/components/ui/badge";

export function AvailabilityChip({ qty, minLot, settlementWindow }: { qty: number; minLot: number; settlementWindow: string }) {
  return <Badge variant="outline">Qty {qty.toLocaleString()} | Min {minLot.toLocaleString()} | {settlementWindow}</Badge>;
}
