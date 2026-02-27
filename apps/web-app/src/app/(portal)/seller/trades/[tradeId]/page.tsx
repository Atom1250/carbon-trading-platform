export default async function SellerTradeTasksPage({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params;
  return <h1 className="text-2xl font-semibold">Seller Trade Tasks: {tradeId} (placeholder)</h1>;
}
