import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewProjectWizard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Project</h1>
      <Card>
        <CardHeader>
          <CardTitle>Wizard foundation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          Next step: implement 7-step wizard with react-hook-form and zod schema.
        </CardContent>
      </Card>
    </div>
  );
}
