import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JoinInstitution() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Join an Institution</h1>
      <Card>
        <CardHeader>
          <CardTitle>Invite Code</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          TODO: input invite code, validate, bind to institution, then route to /onboarding/person/new.
        </CardContent>
      </Card>
    </div>
  );
}
