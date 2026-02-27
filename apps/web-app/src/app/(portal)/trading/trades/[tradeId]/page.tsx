import { TradeSettlementConsole } from "@/components/trading/TradeSettlementConsole";
import { getSettlementTimeline, getTrade } from "@/lib/trading/api";

export default async function TradeDetail({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params;
  const trade = await getTrade(tradeId);
  if (!trade) return <div className="text-sm text-muted-foreground">Trade not found.</div>;
  const timeline = await getSettlementTimeline(tradeId);
  return <TradeSettlementConsole trade={trade} initialMilestones={timeline} />;
}
