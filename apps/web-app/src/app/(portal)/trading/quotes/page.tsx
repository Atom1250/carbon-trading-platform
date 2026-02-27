import { QuotesBlotterClient } from "@/components/trading/QuotesBlotterClient";
import { listListings, listQuotes, listRfqs } from "@/lib/trading/api";

export default async function QuotesBlotter() {
  const [quotes, rfqs, listings] = await Promise.all([listQuotes(), listRfqs(), listListings()]);

  const rfqMap = new Map(rfqs.map((r) => [r.id, r]));
  const listingMap = new Map(listings.map((l) => [l.id, l]));
  const enriched = quotes.map((q) => {
    const rfq = rfqMap.get(q.rfqId);
    const listing = rfq?.listingId ? listingMap.get(rfq.listingId) : undefined;
    return {
      ...q,
      projectName: listing?.projectName,
      standard: listing?.standard,
    };
  });

  return <QuotesBlotterClient quotes={enriched} />;
}
