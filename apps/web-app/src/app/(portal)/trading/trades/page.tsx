import { TradesBlotterClient } from "@/components/trading/TradesBlotterClient";
import { listTrades } from "@/lib/trading/api";

export default async function TradesBlotter() {
  const trades = await listTrades();
  return <TradesBlotterClient trades={trades} />;
}
