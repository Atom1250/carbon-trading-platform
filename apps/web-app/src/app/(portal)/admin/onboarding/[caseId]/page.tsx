"use client";

import { useEffect, useState } from "react";
import { AdminDecisionBar } from "@/components/onboarding/admin/AdminDecisionBar";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOnboardingCase, setRiskRating, updateCaseStatus } from "@/lib/onboarding/api";
import type { CaseStatus, OnboardingCase, RiskRating } from "@/lib/onboarding/types";

export default function AdminOnboardingCase({ params }: { params: { caseId: string } }) {
  const [onboardingCase, setOnboardingCase] = useState<OnboardingCase | null>(null);

  useEffect(() => {
    getOnboardingCase(params.caseId).then(setOnboardingCase);
  }, [params.caseId]);

  if (!onboardingCase) {
    return <div className="text-sm text-muted-foreground">Case not found.</div>;
  }

  const title = onboardingCase.kind === "INSTITUTION" ? `Institution: ${onboardingCase.institution.legalName}` : `Person: ${onboardingCase.person.fullName}`;

  const onSetStatus = async (status: CaseStatus) => {
    await updateCaseStatus(params.caseId, status);
  };

  const onSetRisk = async (risk: RiskRating) => {
    await setRiskRating(params.caseId, risk);
  };

  const screeningCount = onboardingCase.screening.length;
  const documentsCount = onboardingCase.documents.length;
  const fieldIssuesCount = onboardingCase.fieldIssues.length;
  const docRequestsCount = onboardingCase.documentRequests.length;

  return (
    <FigmaPage
      title="Case Review"
      subtitle={title}
      right={
        <div className="flex gap-2">
          <Badge variant="secondary">{onboardingCase.status}</Badge>
          <Badge variant="outline">Risk: {onboardingCase.riskRating}</Badge>
        </div>
      }
    >
      <FigmaStatGrid
        stats={[
          { key: "screening", label: "Screening Checks", value: String(screeningCount) },
          { key: "docs", label: "Documents", value: String(documentsCount) },
          { key: "issues", label: "Field Issues", value: String(fieldIssuesCount) },
          { key: "requests", label: "Doc Requests", value: String(docRequestsCount) },
        ]}
      />

      <AdminDecisionBar onSetStatus={onSetStatus} onSetRisk={onSetRisk} />

      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="ownership">Ownership</TabsTrigger>
          <TabsTrigger value="individuals">Individuals</TabsTrigger>
          <TabsTrigger value="screening">Screening</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <FigmaPanel title="Summary" subtitle="Current case posture and profile context.">
            <div className="space-y-2 text-sm text-white/75">
              <div>Kind: {onboardingCase.kind}</div>
              <div>Status: {onboardingCase.status}</div>
              <div>Reviewer: {onboardingCase.assignedReviewer ?? "-"}</div>
              <div>Updated: {onboardingCase.updatedAt}</div>
              {onboardingCase.kind === "INSTITUTION" && (
                <>
                  <div>Country: {onboardingCase.institution.countryOfIncorporation}</div>
                  <div>Industry: {onboardingCase.business.industry}</div>
                  <div>Purpose: {onboardingCase.business.purposeOfRelationship}</div>
                </>
              )}
              {onboardingCase.kind === "PERSON" && (
                <>
                  <div>Linked institution: {onboardingCase.institutionId ?? "-"}</div>
                  <div>Roles: {onboardingCase.person.roles.join(", ")}</div>
                </>
              )}
            </div>
          </FigmaPanel>
        </TabsContent>

        <TabsContent value="ownership">
          <FigmaPanel title="Ownership & Control" subtitle="UBO and control review trail.">
            <div className="text-sm text-white/75">TODO: UBO threshold compliance, ownership table, and review notes.</div>
          </FigmaPanel>
        </TabsContent>

        <TabsContent value="individuals">
          <FigmaPanel title="Individuals" subtitle="Person-level KYC checklist and evidence review.">
            <div className="text-sm text-white/75">TODO: per-person checklist, identity evidence, and reviewer notes.</div>
          </FigmaPanel>
        </TabsContent>

        <TabsContent value="screening">
          <FigmaPanel title="Screening" subtitle="Sanctions, PEP, and adverse media dispositions.">
            <div className="text-sm text-white/75">TODO: sanctions, PEP, and adverse media results/dispositions.</div>
          </FigmaPanel>
        </TabsContent>

        <TabsContent value="documents">
          <FigmaPanel title="Documents" subtitle="Document review decisioning and request workflow.">
            <div className="text-sm text-white/75">TODO: accept/reject documents with comments and request additional files.</div>
          </FigmaPanel>
        </TabsContent>

        <TabsContent value="audit">
          <FigmaPanel title="Audit" subtitle="Case mutation and decision traceability.">
            <div className="text-sm text-white/75">TODO: audit log for field changes, documents, and decisions.</div>
          </FigmaPanel>
        </TabsContent>
      </Tabs>
    </FigmaPage>
  );
}
