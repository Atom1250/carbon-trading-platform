import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function SellerInventoryPage() {
  return (
    <FigmaPage title="Seller Inventory" subtitle="Inventory availability, vintage split, and lot status.">
      <FigmaStatGrid
        stats={[
          { key: "lots", label: "Active Lots", value: "17" },
          { key: "qty", label: "Available Qty", value: "124,500" },
          { key: "reserved", label: "Reserved", value: "21,000" },
          { key: "pending", label: "Pending Transfer", value: "8,200" },
        ]}
      />

      <FigmaPanel title="Inventory Lots" subtitle="Top lots by quantity and readiness.">
        <div className="space-y-2">
          <FigmaListItem title="LOT-VCU-2022-0441" meta="VCS 2022 | Qty 32,000" body="KYC verified, available for RFQ." />
          <FigmaListItem title="LOT-GS-2021-0198" meta="Gold Standard 2021 | Qty 18,400" body="Reserved for active negotiations." />
          <FigmaListItem title="LOT-ACR-2023-0987" meta="ACR 2023 | Qty 12,100" body="Pending counterparty transfer confirmation." />
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
