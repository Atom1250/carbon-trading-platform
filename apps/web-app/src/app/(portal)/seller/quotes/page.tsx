import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function SellerQuotesPage() {
  return (
    <FigmaPage title="Seller Quotes" subtitle="Quote lifecycle, counterparty negotiations, and expiry control.">
      <FigmaStatGrid
        stats={[
          { key: "open", label: "Open Quotes", value: "9" },
          { key: "accepted", label: "Accepted", value: "3" },
          { key: "expiring", label: "Expiring <24h", value: "2" },
          { key: "rejected", label: "Rejected", value: "4" },
        ]}
      />

      <FigmaPanel title="Quote Book" subtitle="Most recent quote updates and negotiation state.">
        <div className="space-y-2">
          <FigmaListItem title="Q-22914 | RFQ-8802" meta="Counterparty: INV Alpha | Expires in 6h" body="Counterparty requested tighter spread." />
          <FigmaListItem title="Q-22891 | RFQ-8770" meta="Counterparty: INV Delta | Accepted" body="Transitioned to trade execution." />
          <FigmaListItem title="Q-22863 | RFQ-8734" meta="Counterparty: INV Sigma | Rejected" body="Term mismatch on settlement window." />
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
