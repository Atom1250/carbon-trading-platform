import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDocumentIssues } from "@/lib/admin/api";

export default async function AdminDocumentsPage() {
  const issues = await getDocumentIssues();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Document Control Panel</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Document Issues</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {issues.map((d) => (
            <div key={d.id} className="rounded-md border p-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{d.documentName}</div>
                <Badge variant={d.issueType === "MISSING_CRITICAL" ? "destructive" : "outline"}>{d.issueType}</Badge>
              </div>
              <div className="text-muted-foreground">{d.objectType} {d.objectId} | version {d.version}{d.dueAt ? ` | due ${d.dueAt}` : ""}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
