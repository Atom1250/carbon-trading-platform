import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { FigmaPage, FigmaPanel } from "@/components/figma/FigmaPortalPrimitives";

export default function PersonalKycWizard() {
  const steps = [
    { key: "join", label: "Link", status: "DONE" as const },
    { key: "profile", label: "Personal Info", status: "ACTIVE" as const },
    { key: "id", label: "ID & Address", status: "TODO" as const },
    { key: "review", label: "Review", status: "TODO" as const },
  ];

  return (
    <FigmaPage title="Personal KYC" subtitle="Progressive onboarding flow for individual verification and approval.">
      <OnboardingStepper steps={steps} />

      <FigmaPanel title="Wizard Configuration" subtitle="Current container aligned to Figma flow structure.">
        <div className="text-sm text-white/70">
          Next implementation slice: collect identity profile, document upload, screening confirmation, and final submission handoff.
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
