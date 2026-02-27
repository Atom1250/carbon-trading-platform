import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Institutional Onboarding</h1>
      <OnboardingStepper steps={steps} />

      <Card>
        <CardHeader>
          <CardTitle>Wizard foundation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          TODO: implement 6-step wizard using react-hook-form and zod schemas with save draft and deterministic blockers.
        </CardContent>
      </Card>
    </div>
  );
}
