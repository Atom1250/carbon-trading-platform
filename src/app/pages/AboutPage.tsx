import { Link } from "react-router";
import { ArrowRight, Target, Users, Award, Globe } from "lucide-react";

const team = [
  { name: "Dr. Amara Osei", role: "Chief Executive Officer", bio: "20 years in sustainable development finance across Sub-Saharan Africa and Southeast Asia." },
  { name: "Lena Hartmann", role: "Chief Carbon Officer", bio: "Former Verra methodology lead with expertise in REDD+ and blue carbon standards." },
  { name: "James Tran", role: "Chief Technology Officer", bio: "Pioneered tokenised carbon credit infrastructure at two leading climate-tech startups." },
  { name: "Sofia Reyes", role: "Head of Project Finance", role2: "", bio: "Structured over $1.2B in green bonds and sustainability-linked loans across 30 markets." },
];

const milestones = [
  { year: "2020", text: "Earth1.one founded with a mission to democratise access to climate finance." },
  { year: "2021", text: "Launched first pilot with 12 reforestation projects in the Amazon basin." },
  { year: "2022", text: "Registered as an approved carbon credit registry under Verra VCS Programme." },
  { year: "2023", text: "Crossed $1B in project financing and 5M carbon credits verified and retired." },
  { year: "2024", text: "Expanded to Asia-Pacific and launched live carbon trading marketplace." },
  { year: "2025", text: "Onboarded 300+ projects; launched AI-driven MRV monitoring tools." },
  { year: "2026", text: "Global platform launch — connecting 62 countries on one unified platform." },
];

export function AboutPage() {
  return (
    <div className="text-white">
      {/* Header */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <p className="text-emerald-400 text-sm tracking-widest uppercase mb-4">Our Story</p>
          <h1 className="text-5xl md:text-6xl text-white mb-6 max-w-3xl" style={{ fontWeight: 700, lineHeight: 1.1 }}>
            Mobilising capital<br />
            <span className="text-emerald-400">for a net-zero world</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl" style={{ lineHeight: 1.8 }}>
            Earth1.one was built on a simple premise: the planet needs trillions of dollars of climate finance, and the friction in today's markets is slowing us down. We exist to remove that friction.
          </p>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="max-w-7xl mx-auto px-6 pb-20 grid md:grid-cols-2 gap-8">
        {[
          {
            icon: <Target className="w-6 h-6 text-emerald-400" />,
            title: "Our Mission",
            text: "To accelerate the transition to a net-zero economy by providing project developers, investors and traders with the most efficient, transparent and trustworthy platform for climate finance and carbon markets.",
          },
          {
            icon: <Globe className="w-6 h-6 text-emerald-400" />,
            title: "Our Vision",
            text: "A world where every high-quality climate project can access the capital it needs, every tonne of carbon is accurately measured and every credit is transparently retired — on a single, borderless platform.",
          },
        ].map((card) => (
          <div key={card.title} className="p-8 rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
              {card.icon}
            </div>
            <h3 className="text-white mb-3" style={{ fontWeight: 600, fontSize: "1.2rem" }}>{card.title}</h3>
            <p className="text-white/55 text-sm" style={{ lineHeight: 1.8 }}>{card.text}</p>
          </div>
        ))}
      </section>

      {/* Timeline */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <p className="text-emerald-400 text-sm tracking-widest uppercase mb-3">Timeline</p>
          <h2 className="text-3xl md:text-4xl text-white mb-12" style={{ fontWeight: 700 }}>
            How we got here
          </h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[72px] top-0 bottom-0 w-px bg-white/10 hidden md:block" />
            <div className="flex flex-col gap-6">
              {milestones.map((m) => (
                <div key={m.year} className="flex items-start gap-6">
                  <div className="w-16 shrink-0 text-right">
                    <span className="text-emerald-400 text-sm" style={{ fontWeight: 600 }}>{m.year}</span>
                  </div>
                  <div className="hidden md:flex items-center justify-center w-8 h-8 shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-white/60 text-sm pt-1" style={{ lineHeight: 1.7 }}>{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <p className="text-emerald-400 text-sm tracking-widest uppercase mb-3">Leadership</p>
        <h2 className="text-3xl md:text-4xl text-white mb-12" style={{ fontWeight: 700 }}>
          Meet the team
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.map((member) => (
            <div key={member.name} className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-emerald-500/30 hover:bg-white/[0.06] transition-all">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-white text-sm mb-0.5" style={{ fontWeight: 600 }}>{member.name}</p>
              <p className="text-emerald-400 text-xs mb-3">{member.role}</p>
              <p className="text-white/50 text-xs" style={{ lineHeight: 1.7 }}>{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Awards */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <p className="text-emerald-400 text-sm tracking-widest uppercase mb-3">Recognition</p>
              <h2 className="text-3xl text-white mb-4" style={{ fontWeight: 700 }}>
                Trusted by the industry
              </h2>
              <p className="text-white/55 text-sm max-w-md" style={{ lineHeight: 1.8 }}>
                Earth1.one has been recognised by leading sustainability and finance bodies for our commitment to integrity, innovation and impact.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 flex-1 justify-center md:justify-end">
              {["UNFCCC Observer", "Verra Partner", "Gold Standard Affiliate", "ICVCM Member", "Climate Bonds Partner"].map((award) => (
                <div key={award} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] text-white/60 text-sm">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  {award}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl text-white mb-4" style={{ fontWeight: 700 }}>
          Ready to get started?
        </h2>
        <p className="text-white/55 mb-8 max-w-xl mx-auto">
          Join thousands of project owners, investors and traders already using Earth1.one.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#060f1e] transition-colors"
          style={{ fontWeight: 600 }}
        >
          Sign In to Platform <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
