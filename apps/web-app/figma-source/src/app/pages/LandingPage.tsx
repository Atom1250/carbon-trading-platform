import { Link } from "react-router";
import { ArrowRight, TrendingUp, Leaf, BarChart3, Globe, Shield, Zap } from "lucide-react";

const heroImage = "https://images.unsplash.com/photo-1671308819531-1097d5ab5dcc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlYXJ0aCUyMHN1c3RhaW5hYmlsaXR5JTIwZ3JlZW4lMjBlbmVyZ3klMjBhZXJpYWx8ZW58MXx8fHwxNzcyMTA1Nzk1fDA&ixlib=rb-4.1.0&q=80&w=1080";
const forestImage = "https://images.unsplash.com/photo-1681018525279-7ecb65b12b7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXJib24lMjBmb3Jlc3QlMjB0cmVlcyUyMHJlbmV3YWJsZSUyMHByb2plY3R8ZW58MXx8fHwxNzcyMTA1ODAwfDA&ixlib=rb-4.1.0&q=80&w=1080";
const solarImage = "https://images.unsplash.com/photo-1762381157076-4872b31961e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2xhciUyMHdpbmQlMjBmYXJtJTIwY2xlYW4lMjBlbmVyZ3klMjBsYW5kc2NhcGV8ZW58MXx8fHwxNzcyMTA1ODAxfDA&ixlib=rb-4.1.0&q=80&w=1080";
const financeImage = "https://images.unsplash.com/photo-1763451327215-4dbaa5315591?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNlJTIwaW52ZXN0bWVudCUyMGdyZWVuJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzIxMDU4MDF8MA&ixlib=rb-4.1.0&q=80&w=1080";

const stats = [
  { value: "$4.2B+", label: "Projects Financed" },
  { value: "18M+", label: "Carbon Credits Traded" },
  { value: "340+", label: "Active Projects" },
  { value: "62", label: "Countries Covered" },
];

const features = [
  {
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    title: "Project Finance",
    desc: "Access structured financing for renewable energy, reforestation and sustainable infrastructure projects worldwide.",
  },
  {
    icon: <Leaf className="w-5 h-5 text-emerald-400" />,
    title: "Carbon Credits",
    desc: "Issue, verify and trade certified carbon credits on a transparent, blockchain-anchored marketplace.",
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
    title: "Live Markets",
    desc: "Real-time pricing, order books and analytics for voluntary and compliance carbon markets.",
  },
  {
    icon: <Globe className="w-5 h-5 text-emerald-400" />,
    title: "Global Reach",
    desc: "Connect project developers with impact investors and corporate buyers across six continents.",
  },
  {
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    title: "Verified Integrity",
    desc: "Every project undergoes rigorous third-party verification to the latest Verra and Gold Standard methodologies.",
  },
  {
    icon: <Zap className="w-5 h-5 text-emerald-400" />,
    title: "Instant Settlement",
    desc: "Smart-contract settlement means credits are retired and certificates issued within seconds of trade execution.",
  },
];

const userPaths = [
  {
    to: "/login/project-owner",
    title: "Project Owners",
    desc: "Register your project, submit verification documents and access capital from our global investor network.",
    icon: "🌿",
    color: "from-emerald-600/20 to-emerald-900/10",
    border: "border-emerald-500/30 hover:border-emerald-400/60",
  },
  {
    to: "/login/funder",
    title: "Funders & Investors",
    desc: "Discover bankable green projects, conduct due diligence and deploy capital with confidence.",
    icon: "💼",
    color: "from-sky-600/20 to-sky-900/10",
    border: "border-sky-500/30 hover:border-sky-400/60",
  },
  {
    to: "/login/carbon-trader",
    title: "Carbon Traders",
    desc: "Trade verified carbon credits on live markets, manage portfolios and retire credits on behalf of clients.",
    icon: "📈",
    color: "from-violet-600/20 to-violet-900/10",
    border: "border-violet-500/30 hover:border-violet-400/60",
  },
];

export function LandingPage() {
  return (
    <div className="text-white">
      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Earth from above"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060f1e]/60 via-[#060f1e]/50 to-[#060f1e]" />
        </div>

        {/* Subtle glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-24">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Platform Now Live — Voluntary Carbon Markets Q1 2026
          </div>

          <h1 className="text-5xl md:text-7xl text-white mb-6 max-w-4xl" style={{ fontWeight: 700, lineHeight: 1.1 }}>
            Finance the Future.<br />
            <span className="text-emerald-400">Trade the Planet.</span>
          </h1>

          <p className="text-white/60 text-lg md:text-xl max-w-2xl mb-12" style={{ lineHeight: 1.7 }}>
            Earth1.one connects project developers, impact investors and carbon traders on one integrated platform — accelerating the capital flows the planet needs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/get-started"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#060f1e] transition-colors"
              style={{ fontWeight: 600 }}
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/20 hover:border-white/40 text-white/80 hover:text-white transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl text-emerald-400 mb-1" style={{ fontWeight: 700 }}>{s.value}</div>
              <div className="text-white/50 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-emerald-400 text-sm tracking-widest uppercase mb-3">Platform Capabilities</p>
          <h2 className="text-3xl md:text-5xl text-white" style={{ fontWeight: 700, lineHeight: 1.2 }}>
            Everything you need,<br />in one place
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-white mb-2" style={{ fontWeight: 600 }}>{f.title}</h3>
              <p className="text-white/50 text-sm" style={{ lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Image showcase ── */}
      <section className="max-w-7xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
        {[
          { src: forestImage, label: "Reforestation Projects" },
          { src: solarImage, label: "Renewable Energy" },
          { src: financeImage, label: "Green Finance" },
        ].map((img) => (
          <div key={img.label} className="relative rounded-2xl overflow-hidden aspect-[4/3] group">
            <img src={img.src} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060f1e]/80 to-transparent" />
            <span className="absolute bottom-4 left-4 text-white/80 text-sm" style={{ fontWeight: 500 }}>{img.label}</span>
          </div>
        ))}
      </section>

      {/* ── User paths / CTA cards ── */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <p className="text-emerald-400 text-sm tracking-widest uppercase mb-3">Get Started</p>
            <h2 className="text-3xl md:text-5xl text-white" style={{ fontWeight: 700 }}>
              Choose your path
            </h2>
            <p className="text-white/50 mt-4 max-w-xl mx-auto">
              Earth1.one serves three distinct communities. Select the portal that matches your role.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {userPaths.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className={`group relative p-8 rounded-2xl border bg-gradient-to-br ${p.color} ${p.border} transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/20`}
              >
                <div className="text-4xl mb-5">{p.icon}</div>
                <h3 className="text-white mb-3" style={{ fontWeight: 600, fontSize: "1.2rem" }}>{p.title}</h3>
                <p className="text-white/50 text-sm mb-6" style={{ lineHeight: 1.7 }}>{p.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm group-hover:gap-3 transition-all">
                  Sign In <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}