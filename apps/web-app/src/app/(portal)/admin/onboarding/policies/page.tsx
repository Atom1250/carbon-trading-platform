import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function OnboardingPolicies() {
  const policies = [
    "Beneficial ownership threshold by entity type and jurisdiction",
    "Required document matrix by jurisdiction and risk profile",
    "Proof-of-address recency and accepted evidence classes",
    "Enhanced due diligence triggers and escalation levels",
  ];

  return (
    <FigmaPage title="Onboarding Policies" subtitle="KYC policy controls and compliance operating thresholds.">
      <FigmaStatGrid
        stats={[
          { key: "areas", label: "Policy Areas", value: String(policies.length) },
          { key: "ubo", label: "UBO Rules", value: "Planned" },
          { key: "docs", label: "Doc Matrix", value: "Planned" },
          { key: "edd", label: "EDD Triggers", value: "Planned" },
        ]}
      />
      <FigmaPanel title="Policy Configuration" subtitle="Target policy controls for onboarding governance.">
        <div className="space-y-2">
          {policies.map((policy) => (
            <FigmaListItem key={policy} title={policy} />
          ))}
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
