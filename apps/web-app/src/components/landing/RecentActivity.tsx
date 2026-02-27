import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentActivity() {
  const recents = [
    { label: "Sunridge Solar SPV - Underwrite", href: "/investor/projects/p_001/underwrite", meta: "Viewed 2h ago" },
    { label: "RFQ-001 - Quote Inbox", href: "/trading/rfq/rfq_001", meta: "Viewed yesterday" },
    { label: "Onboarding - Institution profile", href: "/onboarding/start", meta: "Updated 3d ago" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {recents.map((r, idx) => (
          <div key={idx} className="flex items-start justify-between gap-3">
            <Link className="underline" href={r.href}>
              {r.label}
            </Link>
            <div className="whitespace-nowrap text-xs text-muted-foreground">{r.meta}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
