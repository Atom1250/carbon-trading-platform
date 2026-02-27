import { useState } from "react";
import {
  Activity, Users, Building2, Layers, Wallet, CheckCircle, Clock,
  AlertCircle, XCircle, TrendingUp, TrendingDown, Leaf, Zap, Wind,
  Droplets, Flame, ArrowUpRight, ArrowDownRight, Database, Cpu, Globe,
  RefreshCw, Filter, ChevronRight, BarChart3, DollarSign, Coins
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ── Mock data ───────────────────────────────────────────────

const chainStatusItems = [
  { label: "Mainnet", status: "online", blockTime: "12s ago", txCount: 1847, tps: 42 },
  { label: "Smart Contracts", status: "online", detail: "4 deployed, all active" },
  { label: "Oracle Feed", status: "online", detail: "Updated 4s ago" },
  { label: "API Gateway", status: "online", detail: "99.97% uptime (30d)" },
  { label: "IPFS Storage", status: "degraded", detail: "Latency elevated" },
  { label: "KYC Service", status: "online", detail: "Running v3.1.2" },
];

const onboardingStages = [
  { stage: "Application Submitted", count: 14, color: "#60a5fa" },
  { stage: "KYC Under Review", count: 9, color: "#f59e0b" },
  { stage: "KYC Approved", count: 7, color: "#a78bfa" },
  { stage: "Inst. Approval Pending", count: 5, color: "#fb7185" },
  { stage: "Active", count: 277, color: "#34d399" },
];

const recentUsers = [
  { name: "Priya Nambiar", institution: "Meridian Development Finance", role: "Funder", status: "pending_kyc", submitted: "2026-02-24" },
  { name: "Lucas Fernandez", institution: "Atlas Carbon Brokerage", role: "Carbon Trader", status: "pending_inst", submitted: "2026-02-23" },
  { name: "Mei-Ling Zhang", institution: "AsiaPac Green Bank", role: "Funder", status: "active", submitted: "2026-02-22" },
  { name: "Tobias Roth", institution: "Nordic Climate Investment AB", role: "Project Owner", status: "kyc_review", submitted: "2026-02-21" },
  { name: "Adaeze Okafor", institution: "Sahara Renewables Group", role: "Project Owner", status: "active", submitted: "2026-02-20" },
  { name: "James McAllister", institution: "Horizon Impact Fund LLC", role: "Funder", status: "active", submitted: "2026-02-19" },
  { name: "Yuki Tanaka", institution: "Pacific Sustainability Fund", role: "Carbon Trader", status: "pending_kyc", submitted: "2026-02-19" },
];

const pendingInstitutions = [
  { name: "Volta Climate Fund", type: "Asset Manager", country: "Netherlands", submitted: "2026-02-23", docs: 6, docsReq: 6 },
  { name: "Bamboo Capital Partners", type: "Project Developer", country: "Kenya", submitted: "2026-02-22", docs: 5, docsReq: 6 },
  { name: "Sunrise Green Energy Corp", type: "Corporate", country: "India", submitted: "2026-02-21", docs: 6, docsReq: 6 },
  { name: "BlueWave Trading Ltd", type: "Carbon Brokerage", country: "Singapore", submitted: "2026-02-20", docs: 4, docsReq: 6 },
];

const projects = [
  { id: "P001", name: "Amazon Basin Reforestation", type: "Reforestation", country: "Brazil", fundingReq: 48.5, annualCredits: 320000, stage: "Live", lifeYears: 30, category: "Nature" },
  { id: "P002", name: "Rajasthan Solar Farm", type: "Solar PV", country: "India", fundingReq: 120.0, annualCredits: 185000, stage: "Financing", lifeYears: 25, category: "Renewable" },
  { id: "P003", name: "Borneo Blue Carbon", type: "Blue Carbon", country: "Indonesia", fundingReq: 32.0, annualCredits: 95000, stage: "Verification", lifeYears: 40, category: "Nature" },
  { id: "P004", name: "Kenya Wind Portfolio", type: "Wind", country: "Kenya", fundingReq: 85.5, annualCredits: 140000, stage: "Live", lifeYears: 20, category: "Renewable" },
  { id: "P005", name: "Landfill Gas Capture – SA", type: "Methane Capture", country: "South Africa", fundingReq: 18.2, annualCredits: 62000, stage: "Live", lifeYears: 15, category: "Waste" },
  { id: "P006", name: "Nordic Deep Peat Restore", type: "Reforestation", country: "Sweden", fundingReq: 24.0, annualCredits: 48000, stage: "Financing", lifeYears: 50, category: "Nature" },
  { id: "P007", name: "Lagos Efficient Cookstoves", type: "Energy Efficiency", country: "Nigeria", fundingReq: 8.4, annualCredits: 210000, stage: "Live", lifeYears: 10, category: "Efficiency" },
  { id: "P008", name: "Patagonia Tidal Energy", type: "Tidal / Hydro", country: "Argentina", fundingReq: 67.0, annualCredits: 88000, stage: "Due Diligence", lifeYears: 30, category: "Renewable" },
];

const projectsByCategory = [
  { name: "Nature", count: 138, color: "#34d399" },
  { name: "Renewable", count: 112, color: "#60a5fa" },
  { name: "Efficiency", count: 54, color: "#f59e0b" },
  { name: "Waste", count: 28, color: "#a78bfa" },
  { name: "Blue Carbon", count: 22, color: "#22d3ee" },
];

const txVolumeData = [
  { month: "Aug", loans: 12.4, credits: 8.1, treasury: 2.3 },
  { month: "Sep", loans: 15.2, credits: 10.5, treasury: 1.8 },
  { month: "Oct", loans: 18.8, credits: 14.2, treasury: 3.1 },
  { month: "Nov", loans: 22.1, credits: 12.8, treasury: 4.5 },
  { month: "Dec", loans: 28.5, credits: 18.3, treasury: 5.2 },
  { month: "Jan", loans: 32.4, credits: 21.6, treasury: 6.8 },
  { month: "Feb", loans: 38.7, credits: 26.4, treasury: 7.4 },
];

const walletBalances = [
  { label: "Tokenised Loans", value: "$284.7M", raw: 284.7, change: +4.2, unit: "USD", color: "#34d399", icon: <DollarSign className="w-5 h-5" /> },
  { label: "Carbon Credits", value: "18.2M tCO₂e", raw: 18.2, change: +1.8, unit: "tCO₂e", color: "#60a5fa", icon: <Leaf className="w-5 h-5" /> },
  { label: "USDC Treasury", value: "$4.21M", raw: 4.21, change: -0.3, unit: "USDC", color: "#f59e0b", icon: <Coins className="w-5 h-5" /> },
  { label: "ETH Reserve", value: "847 ETH", raw: 847, change: +12, unit: "ETH", color: "#a78bfa", icon: <Database className="w-5 h-5" /> },
];

const pieData = projectsByCategory;

// ── Helpers ─────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  kyc_review: { label: "KYC Review", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  pending_kyc: { label: "Pending KYC", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" },
  pending_inst: { label: "Inst. Approval", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30" },
};

const stageConfig: Record<string, string> = {
  "Live": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  "Financing": "text-sky-400 bg-sky-500/10 border-sky-500/30",
  "Verification": "text-amber-400 bg-amber-500/10 border-amber-500/30",
  "Due Diligence": "text-violet-400 bg-violet-500/10 border-violet-500/30",
};

const categoryIcons: Record<string, React.ReactNode> = {
  "Reforestation": <Leaf className="w-3.5 h-3.5" />,
  "Solar PV": <Zap className="w-3.5 h-3.5" />,
  "Wind": <Wind className="w-3.5 h-3.5" />,
  "Blue Carbon": <Droplets className="w-3.5 h-3.5" />,
  "Methane Capture": <Flame className="w-3.5 h-3.5" />,
  "Energy Efficiency": <Cpu className="w-3.5 h-3.5" />,
  "Tidal / Hydro": <Droplets className="w-3.5 h-3.5" />,
};

function StatusDot({ status }: { status: string }) {
  const s = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs ${s.bg} ${s.color}`}>
      {s.label}
    </span>
  );
}

function ChainStatusBadge({ status }: { status: string }) {
  if (status === "online") return <span className="flex items-center gap-1 text-emerald-400 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Online</span>;
  if (status === "degraded") return <span className="flex items-center gap-1 text-amber-400 text-xs"><span className="w-2 h-2 rounded-full bg-amber-400" />Degraded</span>;
  return <span className="flex items-center gap-1 text-red-400 text-xs"><span className="w-2 h-2 rounded-full bg-red-400" />Offline</span>;
}

const CustomTooltipStyle = "bg-[#0d1f35] border border-white/10 rounded-lg p-3 text-white/80 text-xs shadow-xl";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={CustomTooltipStyle}>
      <p className="text-white/50 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}M</p>
      ))}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "projects" | "wallets">("overview");
  const [lastRefresh] = useState("14:32:07 UTC");

  const tabs = [
    { id: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
    { id: "users", label: "Users & KYC", icon: <Users className="w-4 h-4" /> },
    { id: "projects", label: "Projects", icon: <Layers className="w-4 h-4" /> },
    { id: "wallets", label: "Wallets & Treasury", icon: <Wallet className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="min-h-[calc(100vh-4rem)] text-white py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Administration Portal</p>
            <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>Platform Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-xs">Last refresh: {lastRefresh}</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-white/50 hover:text-white hover:border-white/20 text-sm transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> All Systems Operational
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] border border-white/10 rounded-xl p-1 w-fit overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Registered Institutions", value: "47", sub: "8 pending KYC", icon: <Building2 className="w-5 h-5 text-emerald-400" />, trend: "+3 this week" },
                { label: "Active Users", value: "277", sub: "23 pending approval", icon: <Users className="w-5 h-5 text-sky-400" />, trend: "+12 this week" },
                { label: "Projects on Platform", value: "340", sub: "48 in pipeline", icon: <Layers className="w-5 h-5 text-violet-400" />, trend: "+7 this month" },
                { label: "Daily Transactions", value: "1,847", sub: "3 pending", icon: <Activity className="w-5 h-5 text-amber-400" />, trend: "+18% vs yesterday" },
              ].map((kpi) => (
                <div key={kpi.label} className="p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">{kpi.icon}</div>
                    <span className="text-emerald-400 text-xs">{kpi.trend}</span>
                  </div>
                  <p className="text-2xl text-white mb-0.5" style={{ fontWeight: 700 }}>{kpi.value}</p>
                  <p className="text-white/50 text-xs">{kpi.label}</p>
                  <p className="text-white/30 text-xs mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Chain Status */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white" style={{ fontWeight: 600 }}>Chain & Infrastructure Status</h3>
                <span className="text-white/30 text-xs">Block #4,291,847</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {chainStatusItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                    <div>
                      <p className="text-white/70 text-sm" style={{ fontWeight: 500 }}>{item.label}</p>
                      <p className="text-white/30 text-xs mt-0.5">{item.detail || `${item.txCount?.toLocaleString()} tx today · ${item.tps} TPS`}</p>
                    </div>
                    <ChainStatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Volume Chart */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Platform Transaction Volume (7 months)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={txVolumeData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gLoans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCredits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="loans" name="Tokenised Loans ($M)" stroke="#34d399" fill="url(#gLoans)" strokeWidth={2} />
                  <Area type="monotone" dataKey="credits" name="Carbon Credits ($M)" stroke="#60a5fa" fill="url(#gCredits)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Onboarding pipeline + project categories */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
                <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Onboarding Pipeline</h3>
                <div className="space-y-3">
                  {onboardingStages.map((s) => (
                    <div key={s.stage} className="flex items-center gap-3">
                      <span className="text-white/40 text-xs w-36 shrink-0">{s.stage}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, (s.count / 277) * 100)}%`, backgroundColor: s.color }}
                        />
                      </div>
                      <span className="text-white/60 text-sm w-8 text-right" style={{ fontWeight: 600 }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
                <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Projects by Category</h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="count" stroke="none">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 flex-1">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-white/60 text-xs">{d.name}</span>
                        </div>
                        <span className="text-white/70 text-xs" style={{ fontWeight: 600 }}>{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS & KYC TAB ── */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Summary row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Institutions", value: "47", icon: <Building2 className="w-4 h-4 text-emerald-400" /> },
                { label: "Pending Inst. KYC", value: "8", icon: <Clock className="w-4 h-4 text-amber-400" /> },
                { label: "Total Users", value: "312", icon: <Users className="w-4 h-4 text-sky-400" /> },
                { label: "Pending User Approvals", value: "35", icon: <AlertCircle className="w-4 h-4 text-violet-400" /> },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-xl border border-white/10 bg-white/[0.03] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <p className="text-xl text-white" style={{ fontWeight: 700 }}>{s.value}</p>
                    <p className="text-white/40 text-xs">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pending Institutions */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white" style={{ fontWeight: 600 }}>Institutions Awaiting KYC Review</h3>
                <button className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
                  <Filter className="w-3.5 h-3.5" /> Filter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Institution", "Type", "Country", "Submitted", "Docs", "Action"].map((h) => (
                        <th key={h} className="text-white/30 text-xs text-left pb-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInstitutions.map((inst) => (
                      <tr key={inst.name} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 pr-4 text-white/80 text-sm">{inst.name}</td>
                        <td className="py-3.5 pr-4 text-white/40 text-xs">{inst.type}</td>
                        <td className="py-3.5 pr-4 text-white/40 text-xs">{inst.country}</td>
                        <td className="py-3.5 pr-4 text-white/40 text-xs">{inst.submitted}</td>
                        <td className="py-3.5 pr-4">
                          <span className={`text-xs ${inst.docs === inst.docsReq ? "text-emerald-400" : "text-amber-400"}`}>
                            {inst.docs}/{inst.docsReq} docs
                          </span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex gap-2">
                            <button className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors">
                              Approve
                            </button>
                            <button className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/70 transition-colors">
                              Review
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Users */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white" style={{ fontWeight: 600 }}>Recent User Registrations</h3>
                <button className="text-white/40 hover:text-white/70 text-sm transition-colors flex items-center gap-1">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Name", "Institution", "Role", "Submitted", "Status", "Action"].map((h) => (
                        <th key={h} className="text-white/30 text-xs text-left pb-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr key={u.name} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 pr-4 text-white/80 text-sm whitespace-nowrap">{u.name}</td>
                        <td className="py-3.5 pr-4 text-white/40 text-xs whitespace-nowrap">{u.institution}</td>
                        <td className="py-3.5 pr-4 text-white/50 text-xs">{u.role}</td>
                        <td className="py-3.5 pr-4 text-white/35 text-xs">{u.submitted}</td>
                        <td className="py-3.5 pr-4"><StatusDot status={u.status} /></td>
                        <td className="py-3.5">
                          {u.status !== "active" ? (
                            <div className="flex gap-2">
                              <button className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors">Approve</button>
                              <button className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/70 transition-colors">Review</button>
                            </div>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Onboarding stages bar */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Onboarding Stage Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={onboardingStages} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="stage" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0d1f35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "rgba(255,255,255,0.8)", fontSize: "12px" }} />
                  <Bar dataKey="count" name="Users" radius={[4, 4, 0, 0]}>
                    {onboardingStages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── PROJECTS TAB ── */}
        {activeTab === "projects" && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {projectsByCategory.map((c) => (
                <div key={c.name} className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="w-2.5 h-2.5 rounded-full mb-3" style={{ backgroundColor: c.color }} />
                  <p className="text-xl text-white mb-0.5" style={{ fontWeight: 700 }}>{c.count}</p>
                  <p className="text-white/40 text-xs">{c.name}</p>
                </div>
              ))}
            </div>

            {/* Category chart */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
                <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Projects by Type</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={projectsByCategory} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} width={75} />
                    <Tooltip contentStyle={{ backgroundColor: "#0d1f35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "rgba(255,255,255,0.8)", fontSize: "12px" }} />
                    <Bar dataKey="count" name="Projects" radius={[0, 4, 4, 0]}>
                      {projectsByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
                <h3 className="text-white mb-4" style={{ fontWeight: 600 }}>Total Platform Stats</h3>
                <div className="space-y-4">
                  {[
                    { label: "Total Projects", value: "340", unit: "" },
                    { label: "Total Funding Required", value: "$1.84B", unit: "" },
                    { label: "Total Annual Carbon Credits", value: "18.2M", unit: "tCO₂e/yr" },
                    { label: "Average Project Life", value: "24.6", unit: "years" },
                    { label: "Avg. Funding per Project", value: "$5.4M", unit: "" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-white/50 text-sm">{s.label}</span>
                      <span className="text-white text-sm" style={{ fontWeight: 600 }}>
                        {s.value} <span className="text-white/30 text-xs">{s.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Projects table */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white" style={{ fontWeight: 600 }}>Active & Pipeline Projects</h3>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
                    <Filter className="w-3.5 h-3.5" /> Filter
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["ID", "Project Name", "Type", "Country", "Funding Req.", "Annual Credits", "Stage", "Life"].map((h) => (
                        <th key={h} className="text-white/30 text-xs text-left pb-3 pr-5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer">
                        <td className="py-3.5 pr-5 text-white/30 text-xs">{p.id}</td>
                        <td className="py-3.5 pr-5 text-white/80 text-sm whitespace-nowrap">{p.name}</td>
                        <td className="py-3.5 pr-5">
                          <span className="flex items-center gap-1.5 text-white/50 text-xs">
                            {categoryIcons[p.type] || <Leaf className="w-3.5 h-3.5" />} {p.type}
                          </span>
                        </td>
                        <td className="py-3.5 pr-5 text-white/40 text-xs">{p.country}</td>
                        <td className="py-3.5 pr-5 text-white/70 text-sm" style={{ fontWeight: 500 }}>${p.fundingReq}M</td>
                        <td className="py-3.5 pr-5 text-white/70 text-sm">{p.annualCredits.toLocaleString()} <span className="text-white/30 text-xs">tCO₂e</span></td>
                        <td className="py-3.5 pr-5">
                          <span className={`px-2.5 py-0.5 rounded-full border text-xs ${stageConfig[p.stage]}`}>{p.stage}</span>
                        </td>
                        <td className="py-3.5 text-white/40 text-xs">{p.lifeYears} yrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── WALLETS & TREASURY TAB ── */}
        {activeTab === "wallets" && (
          <div className="space-y-6">
            {/* Wallet cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {walletBalances.map((w) => (
                <div key={w.label} className="p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${w.color}20`, border: `1px solid ${w.color}40` }}>
                      <span style={{ color: w.color }}>{w.icon}</span>
                    </div>
                    <span className={`flex items-center gap-1 text-xs ${w.change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {w.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(w.change)}%
                    </span>
                  </div>
                  <p className="text-xl text-white mb-1" style={{ fontWeight: 700 }}>{w.value}</p>
                  <p className="text-white/40 text-xs">{w.label}</p>
                </div>
              ))}
            </div>

            {/* Volume chart */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Wallet Activity — 7-Month Trend ($M notional)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={txVolumeData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0d1f35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "rgba(255,255,255,0.8)", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }} />
                  <Bar dataKey="loans" name="Tokenised Loans" fill="#34d399" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="credits" name="Carbon Credits" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="treasury" name="Treasury" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Wallet breakdown table */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
                <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Tokenised Loan Book</h3>
                <div className="space-y-3">
                  {[
                    { label: "Senior Secured Loans", value: "$142.3M", pct: 50 },
                    { label: "Mezzanine Finance", value: "$68.5M", pct: 24 },
                    { label: "Junior / Equity", value: "$42.1M", pct: 15 },
                    { label: "Green Bonds", value: "$31.8M", pct: 11 },
                  ].map((l) => (
                    <div key={l.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/60">{l.label}</span>
                        <span className="text-white/70" style={{ fontWeight: 600 }}>{l.value}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${l.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
                <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Carbon Credit Registry</h3>
                <div className="space-y-3">
                  {[
                    { label: "Issued (Live)", value: "12.4M tCO₂e", pct: 68, color: "bg-emerald-500" },
                    { label: "Locked (Pending Retire)", value: "3.8M tCO₂e", pct: 21, color: "bg-sky-500" },
                    { label: "Retired (Cumulative)", value: "2.0M tCO₂e", pct: 11, color: "bg-violet-500" },
                  ].map((c) => (
                    <div key={c.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/60">{c.label}</span>
                        <span className="text-white/70" style={{ fontWeight: 600 }}>{c.value}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <h4 className="text-white/50 text-xs uppercase tracking-widest mb-3">Treasury Holdings</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { asset: "USDC", amount: "$4.21M", color: "text-amber-400" },
                      { asset: "ETH", amount: "847 ETH", color: "text-violet-400" },
                      { asset: "MATIC", amount: "124,000", color: "text-sky-400" },
                      { asset: "BTC", amount: "4.2 BTC", color: "text-amber-300" },
                    ].map((t) => (
                      <div key={t.asset} className="p-3 rounded-xl bg-white/[0.02] border border-white/8">
                        <p className={`text-xs mb-0.5 ${t.color}`} style={{ fontWeight: 600 }}>{t.asset}</p>
                        <p className="text-white/60 text-sm">{t.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
