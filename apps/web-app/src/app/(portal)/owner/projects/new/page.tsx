import { FigmaPage, FigmaPanel } from "@/components/figma/FigmaPortalPrimitives";

export default function NewProjectWizard() {
  return (
    <FigmaPage title="Create Project" subtitle="Figma-aligned project origination flow.">
      <FigmaPanel title="Project Wizard" subtitle="Seven-step creation workflow container">
        <div className="text-sm text-white/70">
          Steps: Sponsor Profile, Project Scope, Carbon Methodology, Financial Model, Risk & Mitigation, Documents, Review & Submit.
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
