import { RetirementsManager } from "@/components/trading/RetirementsManager";
import { listPositions, listRetirements } from "@/lib/trading/api";

export default async function RetirementsPage() {
  const positions = await listPositions();
  const retirements = await listRetirements();
  return <RetirementsManager initialPositions={positions} initialRetirements={retirements} />;
}
