"use client";

import { useEffect, useState } from "react";
import { AdminDecisionBar } from "@/components/onboarding/admin/AdminDecisionBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Case Review</h1>
          <div className="text-sm text-muted-foreground">{title}</div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{onboardingCase.status}</Badge>
          <Badge variant="outline">Risk: {onboardingCase.riskRating}</Badge>
        </div>
      </div>

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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ownership">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ownership & Control</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">TODO: UBO threshold compliance, ownership table, and review notes.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individuals">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Individuals</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">TODO: per-person checklist, identity evidence, and reviewer notes.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screening">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Screening</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">TODO: sanctions, PEP, and adverse media results/dispositions.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">TODO: accept/reject documents with comments and request additional files.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">TODO: audit log for field changes, documents, and decisions.</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
