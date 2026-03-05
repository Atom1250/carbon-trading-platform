import { BlockersPanel } from "@/components/onboarding/BlockersPanel";
import { Badge } from "@/components/ui/badge";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { getOnboardingCase } from "@/lib/onboarding/api";

export default async function InstitutionStatus({ params }: { params: { caseId: string } }) {
  const onboardingCase = await getOnboardingCase(params.caseId);
  if (!onboardingCase || onboardingCase.kind !== "INSTITUTION") {
    return <div className="text-sm text-muted-foreground">Case not found.</div>;
  }

  return (
    <FigmaPage
      title="Onboarding Status"
      subtitle={onboardingCase.institution.legalName}
      right={
        <div className="flex gap-2">
          <Badge variant="secondary">{onboardingCase.status}</Badge>
          <Badge variant="outline">Risk: {onboardingCase.riskRating}</Badge>
        </div>
      }
    >
      <FigmaStatGrid
        stats={[
          { key: "screenings", label: "Screening Checks", value: String(onboardingCase.screening.length) },
          { key: "documents", label: "Documents Uploaded", value: String(onboardingCase.documents.length) },
          { key: "issues", label: "Field Issues", value: String(onboardingCase.fieldIssues.length) },
          { key: "requests", label: "Document Requests", value: String(onboardingCase.documentRequests.length) },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FigmaPanel className="lg:col-span-2" title="Current Review State" subtitle="Review owner, screening outcomes, and document status.">
          <div className="space-y-2 text-sm text-white/75">
            <div>Reviewer: {onboardingCase.assignedReviewer ?? "-"}</div>
            <div>Screening: {onboardingCase.screening.map((s) => `${s.type}:${s.status}`).join(" | ")}</div>
            <div>Documents: {onboardingCase.documents.length} uploaded</div>
          </div>
        </FigmaPanel>

        <BlockersPanel fieldIssues={onboardingCase.fieldIssues} documentRequests={onboardingCase.documentRequests} />
      </div>
    </FigmaPage>
  );
}
