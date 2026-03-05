import Link from "next/link";
import { FigmaListItem, FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function AdminTradingPage() {
  const links = [
    { title: "Unified dashboard", href: "/admin/dashboard", desc: "Cross-domain controls and operator visibility." },
    { title: "Task engine", href: "/admin/tasks", desc: "Action queue for policy and exception handling." },
    { title: "Risk dashboard", href: "/admin/risk", desc: "Portfolio-level risk and anomaly oversight." },
    { title: "SLA monitor", href: "/admin/sla", desc: "Operational latency and breach tracking." },
    { title: "RFQ oversight", href: "/admin/trading/rfqs", desc: "Demand-side request governance." },
    { title: "Trade oversight", href: "/admin/trading/trades", desc: "Settlement and execution supervision." },
    { title: "Dispute handling", href: "/admin/disputes", desc: "Escalation workflow and case routing." },
    { title: "Document control", href: "/admin/documents", desc: "Controlled document access and reviews." },
    { title: "Policies", href: "/admin/trading/policies", desc: "Market operation policy configuration." },
  ];

  return (
    <FigmaPage title="Admin Trading Dashboard" subtitle="Operational command center for market governance.">
      <FigmaStatGrid
        stats={[
          { key: "areas", label: "Oversight Areas", value: String(links.length) },
          { key: "rfq", label: "RFQ Controls", value: "Active" },
          { key: "trade", label: "Trade Controls", value: "Active" },
          { key: "policy", label: "Policy Surface", value: "Ready" },
        ]}
      />
      <FigmaPanel title="Oversight Navigation" subtitle="Open each control plane with contextual responsibility.">
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl border border-transparent transition hover:border-emerald-300/40">
              <FigmaListItem title={item.title} meta={item.href} body={item.desc} />
            </Link>
          ))}
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
