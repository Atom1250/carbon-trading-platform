import { BlockersPanel } from "@/components/onboarding/BlockersPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOnboardingCase } from "@/lib/onboarding/api";

export default async function InstitutionStatus({ params }: { params: { caseId: string } }) {
  const onboardingCase = await getOnboardingCase(params.caseId);
  if (!onboardingCase || onboardingCase.kind !== "INSTITUTION") {
    return <div className="text-sm text-muted-foreground">Case not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Onboarding Status</h1>
          <div className="text-sm text-muted-foreground">{onboardingCase.institution.legalName}</div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{onboardingCase.status}</Badge>
          <Badge variant="outline">Risk: {onboardingCase.riskRating}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Current Review State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Reviewer: {onboardingCase.assignedReviewer ?? "-"}</div>
            <div>Screening: {onboardingCase.screening.map((s) => `${s.type}:${s.status}`).join(" | ")}</div>
            <div>Documents: {onboardingCase.documents.length} uploaded</div>
          </CardContent>
        </Card>

        <BlockersPanel fieldIssues={onboardingCase.fieldIssues} documentRequests={onboardingCase.documentRequests} />
      </div>
    </div>
  );
}
