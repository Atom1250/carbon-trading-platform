import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FieldIssue, DocumentRequest } from "@/lib/onboarding/types";

export function BlockersPanel({ fieldIssues, documentRequests }: { fieldIssues: FieldIssue[]; documentRequests: DocumentRequest[] }) {
  const blockers = fieldIssues.filter((i) => i.severity === "BLOCKER");
  const openRequests = documentRequests.filter((r) => r.status === "OPEN");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Blockers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {blockers.length === 0 && openRequests.length === 0 && (
          <div className="text-muted-foreground">No blockers. You're good to proceed.</div>
        )}

        {blockers.length > 0 && (
          <div>
            <div className="mb-1 font-medium">Field issues</div>
            <ul className="ml-5 list-disc space-y-1">
              {blockers.map((b, idx) => (
                <li key={idx}>
                  <span className="font-medium">{b.fieldPath}:</span> {b.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {openRequests.length > 0 && (
          <div>
            <div className="mb-1 font-medium">Document requests</div>
            <ul className="ml-5 list-disc space-y-1">
              {openRequests.map((r) => (
                <li key={r.id}>
                  <span className="font-medium">{r.type}:</span> {r.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
