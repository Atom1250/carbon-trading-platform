import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listOnboardingCases } from "@/lib/onboarding/api";

export default async function AdminOnboardingQueue() {
  const cases = await listOnboardingCases();
  const openCases = cases.filter((entry) => entry.status === "DRAFT" || entry.status === "SUBMITTED" || entry.status === "IN_REVIEW").length;
  const blockedCases = cases.filter((entry) => entry.status === "ACTION_REQUIRED").length;
  const approvedCases = cases.filter((entry) => entry.status === "APPROVED").length;

  return (
    <FigmaPage title="Onboarding Queue" subtitle="Institutional and personal onboarding case oversight.">
      <FigmaStatGrid
        stats={[
          { key: "total", label: "Total Cases", value: String(cases.length) },
          { key: "open", label: "Open Cases", value: String(openCases) },
          { key: "blocked", label: "Blocked Cases", value: String(blockedCases) },
          { key: "approved", label: "Approved", value: String(approvedCases) },
        ]}
      />

      <FigmaPanel title="Cases" subtitle="Review queue with risk and reviewer assignment.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Reviewer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link className="underline" href={`/admin/onboarding/${c.id}`}>
                      {c.id}
                    </Link>
                  </TableCell>
                  <TableCell>{c.kind}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.riskRating}</Badge>
                  </TableCell>
                  <TableCell>{c.assignedReviewer ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </FigmaPanel>
    </FigmaPage>
  );
}
