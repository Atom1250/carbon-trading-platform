import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listOnboardingCases } from "@/lib/onboarding/api";

export default async function AdminOnboardingQueue() {
  const cases = await listOnboardingCases();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Onboarding Queue</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cases</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
