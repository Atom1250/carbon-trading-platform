import Link from "next/link";
import type { CurrentUser } from "@/lib/user/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QuickActions({ user }: { user: CurrentUser }) {
  const actions = [
    { key: "createProject", label: "Create a new project", href: "/owner/projects/new", show: user.entitlements.projectOwnerPortal },
    { key: "searchProjects", label: "Search investment opportunities", href: "/investor/search", show: user.entitlements.investorPortal },
    { key: "openMarket", label: "Browse carbon listings", href: "/trading", show: user.entitlements.tradingPortal },
    { key: "startOnboarding", label: "Complete onboarding", href: "/onboarding/start", show: true },
  ].filter((a) => a.show);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.key} asChild variant="secondary">
            <Link href={a.href}>{a.label}</Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
