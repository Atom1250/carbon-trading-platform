import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingStart() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Client Onboarding</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Institutional Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            Create an institutional onboarding case (entity KYC/AML, beneficial ownership, roster, documents).
            <div>
              <Button asChild className="mt-2">
                <Link href="/onboarding/institution/new">Start Institutional Onboarding</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal User (linked to institution)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            Join an institution (invite code) and complete your personal KYC.
            <div className="mt-2 flex gap-2">
              <Button asChild variant="secondary">
                <Link href="/onboarding/person/join">Join Institution</Link>
              </Button>
              <Button asChild>
                <Link href="/onboarding/person/new">Start Personal KYC</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
