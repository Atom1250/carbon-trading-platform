import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { listRfqs } from "@/lib/trading/api";

export default async function AdminTradingRfqs() {
  const rfqs = await listRfqs();
  const activeRfqs = rfqs.filter((rfq) => rfq.status === "DRAFT" || rfq.status === "SENT" || rfq.status === "QUOTED").length;
  const closedRfqs = rfqs.filter((rfq) => rfq.status === "EXPIRED" || rfq.status === "CANCELLED").length;

  return (
    <FigmaPage title="Admin RFQ Oversight" subtitle="Supervise active requests, allocation state, and market response activity.">
      <FigmaStatGrid
        stats={[
          { key: "total", label: "Total RFQs", value: String(rfqs.length) },
          { key: "active", label: "Active RFQs", value: String(activeRfqs) },
          { key: "closed", label: "Closed RFQs", value: String(closedRfqs) },
          { key: "coverage", label: "Oversight Coverage", value: "100%" },
        ]}
      />
      <FigmaPanel title="RFQ List" subtitle="Current RFQ records visible to the operations desk.">
        <div className="space-y-2">
          {rfqs.length === 0 ? (
            <FigmaListItem title="No RFQs yet" body="No RFQ records are currently available." />
          ) : (
            rfqs.map((rfq) => (
              <FigmaListItem
                key={rfq.id}
                title={`${rfq.id} | ${rfq.listingId ?? "Unlisted RFQ"}`}
                meta={`Status: ${rfq.status}`}
                body={`Volume ${rfq.requestedQty.toLocaleString()} tCO2e | Delivery ${rfq.deliveryWindow}`}
              />
            ))
          )}
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
