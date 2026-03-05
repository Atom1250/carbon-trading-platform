import { Badge } from "@/components/ui/badge";
import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { getDocumentIssues } from "@/lib/admin/api";

export default async function AdminDocumentsPage() {
  const issues = await getDocumentIssues();
  const critical = issues.filter((item) => item.issueType === "MISSING_CRITICAL").length;
  const expiring = issues.filter((item) => item.issueType === "EXPIRING").length;

  return (
    <FigmaPage title="Document Control Panel" subtitle="Document lifecycle integrity checks and remediation tracking.">
      <FigmaStatGrid
        stats={[
          { key: "total", label: "Total Issues", value: String(issues.length) },
          { key: "critical", label: "Critical Missing", value: String(critical) },
          { key: "expiring", label: "Expiring Soon", value: String(expiring) },
          { key: "control", label: "Control Status", value: "Monitored" },
        ]}
      />
      <FigmaPanel title="Document Issues" subtitle="Flagged compliance and data quality issues requiring intervention.">
        <div className="space-y-2 text-sm">
          {issues.map((d) => (
            <div key={d.id} className="rounded-xl border border-white/10 bg-[#071326] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-white">{d.documentName}</div>
                <Badge variant={d.issueType === "MISSING_CRITICAL" ? "destructive" : "outline"}>{d.issueType}</Badge>
              </div>
              <FigmaListItem
                title={`${d.objectType} ${d.objectId}`}
                meta={`version ${d.version}${d.dueAt ? ` | due ${d.dueAt}` : ""}`}
                body={`Issue: ${d.issueType}`}
              />
            </div>
          ))}
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
