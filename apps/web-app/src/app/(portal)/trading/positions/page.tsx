import { Badge } from "@/components/ui/badge";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPositions } from "@/lib/trading/api";

export default async function PositionsPage() {
  const positions = await listPositions();
  const held = positions.filter((p) => p.status === "HELD").reduce((a, p) => a + p.qty, 0);
  const pending = positions.filter((p) => p.status === "PENDING").reduce((a, p) => a + p.qty, 0);
  const retired = positions.filter((p) => p.status === "RETIRED").reduce((a, p) => a + p.qty, 0);

  return (
    <FigmaPage title="Positions" subtitle="Portfolio lots and lifecycle status across held, pending, and retired credits.">
      <FigmaStatGrid
        stats={[
          { key: "held", label: "Held", value: held.toLocaleString() },
          { key: "pending", label: "Pending Transfer", value: pending.toLocaleString() },
          { key: "retired", label: "Retired", value: retired.toLocaleString() },
          { key: "lots", label: "Total Lots", value: String(positions.length) },
        ]}
      />
      <FigmaPanel title="Holdings by Lot" subtitle="Lot-level inventory and status.">
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
      </FigmaPanel>
    </FigmaPage>
  );
}
