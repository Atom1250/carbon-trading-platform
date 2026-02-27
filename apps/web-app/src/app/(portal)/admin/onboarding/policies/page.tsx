import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPolicies() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Onboarding Policies (Optional)</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Policy configuration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          TODO: beneficial ownership threshold, required doc matrix by jurisdiction, proof-of-address recency, and EDD triggers.
        </CardContent>
      </Card>
    </div>
  );
}
