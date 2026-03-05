import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function InstitutionOnboardingWizard() {
  const steps = [
    { key: "profile", label: "Profile", status: "ACTIVE" as const },
    { key: "business", label: "Risk & Purpose", status: "TODO" as const },
    { key: "ownership", label: "Ownership", status: "TODO" as const },
    { key: "people", label: "Individuals", status: "TODO" as const },
    { key: "docs", label: "Documents", status: "TODO" as const },
    { key: "review", label: "Review", status: "TODO" as const },
  ];

  return (
    <FigmaPage title="Institutional Onboarding" subtitle="Structured 6-step entity KYC and risk intake workflow.">
      <FigmaStatGrid
        stats={[
          { key: "steps", label: "Workflow Steps", value: String(steps.length) },
          { key: "active", label: "Current Step", value: "Profile" },
          { key: "draft", label: "Draft Save", value: "Planned" },
          { key: "validation", label: "Validation Model", value: "Deterministic" },
        ]}
      />
      <OnboardingStepper steps={steps} />

      <FigmaPanel title="Wizard Foundation" subtitle="Implementation checkpoint for full production onboarding flow.">
        <div className="text-sm text-white/75">
          TODO: implement 6-step wizard using react-hook-form and zod schemas with save draft and deterministic blockers.
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
