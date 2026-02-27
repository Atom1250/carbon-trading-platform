import { Link } from "react-router";
import { Sprout, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function ProjectOwnerLoginPage() {
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-20 px-6">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/8 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Back */}
        <Link to="/login" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to portal selection
        </Link>

        <div className="p-8 md:p-10 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600/10 to-[#060f1e]/80 backdrop-blur-sm">
          {/* Icon + Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-400 text-xs uppercase tracking-widest">Project Owner Portal</p>
              <h1 className="text-white" style={{ fontWeight: 700, fontSize: "1.25rem" }}>Welcome back</h1>
            </div>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-white/70 text-sm block mb-1.5">Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-white/50 cursor-pointer">
                <input type="checkbox" className="rounded" /> Remember me
              </label>
              <a href="#" className="text-emerald-400 hover:text-emerald-300 transition-colors">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#060f1e] transition-colors"
              style={{ fontWeight: 600 }}
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/40 text-sm">
              New to Earth1.one?{" "}
              <a href="#" className="text-emerald-400 hover:text-emerald-300 transition-colors">Register your project</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
