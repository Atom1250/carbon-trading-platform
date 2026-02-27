import { Link } from "react-router";
import { ArrowRight, Building2, User, LogIn } from "lucide-react";

const options = [
  {
    to: "/get-started/institution",
    icon: <Building2 className="w-8 h-8 text-emerald-400" />,
    label: "New Institution",
    tagline: "Register your organisation",
    desc: "Register your company, fund or organisation on Earth1.one. You will be guided through our KYC/AML compliance process and a platform administrator will review your application.",
    color: "from-emerald-600/20 to-emerald-900/5",
    border: "border-emerald-500/30",
    hover: "hover:border-emerald-400/60 hover:shadow-emerald-900/30",
    accent: "text-emerald-400",
    tag: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    note: "Typically 2–5 business days for approval",
  },
  {
    to: "/get-started/user",
    icon: <User className="w-8 h-8 text-sky-400" />,
    label: "New User",
    tagline: "Join as an individual",
    desc: "Register as an individual user linked to a registered institution. Your account requires approval from both your institution and a platform administrator before activation.",
    color: "from-sky-600/20 to-sky-900/5",
    border: "border-sky-500/30",
    hover: "hover:border-sky-400/60 hover:shadow-sky-900/30",
    accent: "text-sky-400",
    tag: "bg-sky-500/10 text-sky-300 border-sky-500/20",
    note: "Requires an active registered institution",
  },
  {
    to: "/login",
    icon: <LogIn className="w-8 h-8 text-white/60" />,
    label: "Existing User",
    tagline: "Sign in to your account",
    desc: "Already registered and approved? Sign in to access your portal — whether you are a project owner, funder or carbon trader.",
    color: "from-white/5 to-white/[0.02]",
    border: "border-white/15",
    hover: "hover:border-white/30 hover:shadow-white/5",
    accent: "text-white/70",
    tag: "bg-white/5 text-white/40 border-white/10",
    note: "Access your existing dashboard",
  },
];

export function GetStartedPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-20 px-6">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Onboarding
          </div>
          <h1 className="text-4xl md:text-5xl text-white mb-4" style={{ fontWeight: 700 }}>
            Join Earth1.one
          </h1>
          <p className="text-white/50 max-w-xl mx-auto" style={{ lineHeight: 1.75 }}>
            Select how you would like to access the platform. All accounts are subject to KYC/AML verification in line with international regulatory standards.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {options.map((opt) => (
            <Link
              key={opt.to}
              to={opt.to}
              className={`group relative flex flex-col p-8 rounded-2xl border bg-gradient-to-br ${opt.color} ${opt.border} ${opt.hover} hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`}
            >
              <span className={`self-start mb-6 px-2.5 py-1 rounded-full border text-xs ${opt.tag}`}>
                {opt.tagline}
              </span>
              <div className="mb-5">{opt.icon}</div>
              <h2 className={`text-xl mb-3 ${opt.accent}`} style={{ fontWeight: 700 }}>
                {opt.label}
              </h2>
              <p className="text-white/50 text-sm mb-6 flex-1" style={{ lineHeight: 1.75 }}>
                {opt.desc}
              </p>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 text-sm ${opt.accent} group-hover:gap-3 transition-all`}>
                  Continue <ArrowRight className="w-4 h-4" />
                </span>
              </div>
              <p className="mt-4 text-white/25 text-xs border-t border-white/10 pt-4">{opt.note}</p>
            </Link>
          ))}
        </div>

        {/* Process steps */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-5">Onboarding Process</p>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { step: "01", label: "Submit Application", desc: "Complete registration form and upload KYC documents." },
              { step: "02", label: "KYC / AML Review", desc: "Our compliance team verifies your identity and documentation." },
              { step: "03", label: "Institutional Approval", desc: "Your linked institution approves your user account access." },
              { step: "04", label: "Platform Access", desc: "Account activated — access your portal and begin transacting." },
            ].map((s) => (
              <div key={s.step} className="flex flex-col gap-2">
                <span className="text-emerald-400 text-xs" style={{ fontWeight: 700 }}>{s.step}</span>
                <span className="text-white/70 text-sm" style={{ fontWeight: 600 }}>{s.label}</span>
                <span className="text-white/35 text-xs" style={{ lineHeight: 1.65 }}>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
