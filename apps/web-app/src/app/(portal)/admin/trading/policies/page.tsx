import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function AdminTradingPolicies() {
  const policyAreas = [
    { id: "rfq", name: "RFQ templates", details: "Standard request structures and required instrument fields." },
    { id: "required", name: "Required fields", details: "Issuer, methodology, vintage, lot size, delivery and pricing terms." },
    { id: "settlement", name: "Settlement rules", details: "Milestone sequencing, override authority, and exception handling." },
    { id: "limits", name: "Trading limits", details: "Exposure thresholds by counterparty, desk, and jurisdiction." },
  ];

  return (
    <FigmaPage title="Admin Trading Policies" subtitle="Governance policies applied to RFQ and settlement workflows.">
      <FigmaStatGrid
        stats={[
          { key: "policy-areas", label: "Policy Areas", value: String(policyAreas.length) },
          { key: "enforcement", label: "Enforcement Mode", value: "Server-side" },
          { key: "override", label: "Override Model", value: "Controlled" },
          { key: "version", label: "Policy Version", value: "v1" },
        ]}
      />
      <FigmaPanel title="Policy Configuration" subtitle="Configuration surfaces currently represented in the admin policy domain.">
        <div className="space-y-2">
          {policyAreas.map((area) => (
            <FigmaListItem key={area.id} title={area.name} body={area.details} />
          ))}
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
