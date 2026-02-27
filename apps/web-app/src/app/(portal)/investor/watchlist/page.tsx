import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvestorWatchlist() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Watchlist (placeholder)</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Saved projects</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Allow bookmark/alert workflows when readiness or documents change.</CardContent>
      </Card>
    </div>
  );
}
