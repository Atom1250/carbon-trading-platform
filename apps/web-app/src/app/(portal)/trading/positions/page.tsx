import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPositions } from "@/lib/trading/api";

export default async function PositionsPage() {
  const positions = await listPositions();
  const held = positions.filter((p) => p.status === "HELD").reduce((a, p) => a + p.qty, 0);
  const pending = positions.filter((p) => p.status === "PENDING").reduce((a, p) => a + p.qty, 0);
  const retired = positions.filter((p) => p.status === "RETIRED").reduce((a, p) => a + p.qty, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Positions</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
        <div className="rounded-md border p-3">Held: <span className="font-medium">{held.toLocaleString()}</span></div>
        <div className="rounded-md border p-3">Pending transfer: <span className="font-medium">{pending.toLocaleString()}</span></div>
        <div className="rounded-md border p-3">Retired: <span className="font-medium">{retired.toLocaleString()}</span></div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Holdings by Lot</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Vintage</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.projectName}</TableCell>
                  <TableCell>{p.standard}</TableCell>
                  <TableCell>{p.vintage}</TableCell>
                  <TableCell>{p.qty.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
