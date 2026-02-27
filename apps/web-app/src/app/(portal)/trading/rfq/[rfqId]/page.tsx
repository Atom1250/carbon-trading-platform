import { RfqQuoteInbox } from "@/components/trading/RfqQuoteInbox";
import { getRfq, listQuotesForRfq } from "@/lib/trading/api";

export default async function RfqDetail({ params }: { params: Promise<{ rfqId: string }> }) {
  const { rfqId } = await params;
  const rfq = await getRfq(rfqId);
  if (!rfq) return <div className="text-sm text-muted-foreground">RFQ not found.</div>;
  const quotes = await listQuotesForRfq(rfqId);
  return <RfqQuoteInbox rfq={rfq} initialQuotes={quotes} />;
}
