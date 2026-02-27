import type { PositionLot } from "@/lib/trading/types";

export function PositionLotRow({ lot }: { lot: PositionLot }) {
  return (
    <div className="grid grid-cols-6 gap-2 rounded-md border p-2 text-sm">
      <div>{lot.id}</div>
      <div>{lot.projectName}</div>
      <div>{lot.standard}</div>
      <div>{lot.vintage}</div>
      <div>{lot.qty.toLocaleString()}</div>
      <div>{lot.status}</div>
    </div>
  );
}
