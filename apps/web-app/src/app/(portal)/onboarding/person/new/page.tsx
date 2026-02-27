import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PersonalKycWizard() {
  const steps = [
    { key: "join", label: "Link", status: "DONE" as const },
    { key: "profile", label: "Personal Info", status: "ACTIVE" as const },
    { key: "id", label: "ID & Address", status: "TODO" as const },
    { key: "review", label: "Review", status: "TODO" as const },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Personal KYC</h1>
      <OnboardingStepper steps={steps} />

      <Card>
        <CardHeader>
          <CardTitle>Wizard foundation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          TODO: implement personal KYC wizard for linked users, including ID uploads and review/submit.
        </CardContent>
      </Card>
    </div>
  );
}
