import { Link } from "react-router";
import { ArrowRight, Sprout, Briefcase, BarChart2 } from "lucide-react";

const portals = [
  {
    to: "/login/project-owner",
    icon: <Sprout className="w-8 h-8 text-emerald-400" />,
    label: "Project Owner",
    tagline: "Develop & Finance",
    desc: "Register climate projects, upload verification documents, track progress and connect with global funding partners.",
    color: "from-emerald-600/20 to-emerald-900/5",
    border: "border-emerald-500/30",
    hover: "hover:border-emerald-400/70 hover:shadow-emerald-900/30",
    accent: "text-emerald-400",
    tag: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  },
  {
    to: "/login/funder",
    icon: <Briefcase className="w-8 h-8 text-sky-400" />,
    label: "Funder",
    tagline: "Invest & Impact",
    desc: "Discover high-quality projects, perform due diligence, deploy capital and track the environmental impact of your portfolio.",
    color: "from-sky-600/20 to-sky-900/5",
    border: "border-sky-500/30",
    hover: "hover:border-sky-400/70 hover:shadow-sky-900/30",
    accent: "text-sky-400",
    tag: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  },
  {
    to: "/login/carbon-trader",
    icon: <BarChart2 className="w-8 h-8 text-violet-400" />,
    label: "Carbon Trader",
    tagline: "Trade & Retire",
    desc: "Access live carbon credit markets, manage trading portfolios, execute orders and retire credits on behalf of corporate clients.",
    color: "from-violet-600/20 to-violet-900/5",
    border: "border-violet-500/30",
    hover: "hover:border-violet-400/70 hover:shadow-violet-900/30",
    accent: "text-violet-400",
    tag: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  },
];

export function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-20 px-6">
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-emerald-400 text-sm tracking-widest uppercase mb-3">Access Your Account</p>
          <h1 className="text-4xl md:text-5xl text-white mb-4" style={{ fontWeight: 700 }}>
            Sign In to Earth1.one
          </h1>
          <p className="text-white/50 max-w-lg mx-auto">
            Select your portal below to access the tools and information relevant to your role on the platform.
          </p>
        </div>

        {/* Portal cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {portals.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className={`group relative flex flex-col p-8 rounded-2xl border bg-gradient-to-br ${p.color} ${p.border} ${p.hover} hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`}
            >
              {/* Tag */}
              <div className={`self-start mb-6 px-2.5 py-1 rounded-full border text-xs ${p.tag}`}>
                {p.tagline}
              </div>

              {/* Icon */}
              <div className="mb-4">{p.icon}</div>

              {/* Text */}
              <h2 className={`text-xl mb-3 ${p.accent}`} style={{ fontWeight: 700 }}>{p.label}</h2>
              <p className="text-white/50 text-sm mb-8 flex-1" style={{ lineHeight: 1.75 }}>{p.desc}</p>

              {/* CTA */}
              <div className={`flex items-center gap-2 text-sm ${p.accent} group-hover:gap-3 transition-all`}>
                Continue <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>

        {/* Admin link */}
        <p className="text-center text-white/40 text-sm mt-10">
          Platform administrator?{" "}
          <Link to="/admin" className="text-white/70 hover:text-white underline underline-offset-2 transition-colors">
            Access Admin Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
