import { FigmaListItem, FigmaPage, FigmaPanel } from "@/components/figma/FigmaPortalPrimitives";

export default async function SellerTradeTasksPage({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params;

  return (
    <FigmaPage title={`Seller Trade Tasks: ${tradeId}`} subtitle="Settlement execution checklist and exception handling.">
      <FigmaPanel title="Execution Checklist" subtitle="Required actions for settlement completion.">
        <div className="space-y-2">
          <FigmaListItem title="Confirm delivery registry transfer" meta="Owner: Seller Ops | Status: In Progress" />
          <FigmaListItem title="Upload payment confirmation" meta="Owner: Finance | Status: Pending" />
          <FigmaListItem title="Acknowledge milestone completion" meta="Owner: Counterparty | Status: Waiting" />
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
