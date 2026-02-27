import { Link, useNavigate } from "react-router";
import { Shield, ArrowLeft, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useState } from "react";

export function AdminPage() {
  const [showPw, setShowPw] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-20 px-6">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        {/* Restricted notice */}
        <div className="flex items-start gap-3 mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-300/80 text-xs" style={{ lineHeight: 1.7 }}>
            This portal is restricted to authorised Earth1.one platform administrators only. Unauthorised access attempts are logged and may be subject to legal action.
          </p>
        </div>

        <div className="p-8 md:p-10 rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.05] to-[#060f1e]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white/70" />
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest">Administration Portal</p>
              <h1 className="text-white" style={{ fontWeight: 700, fontSize: "1.25rem" }}>Secure Sign In</h1>
            </div>
          </div>

          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!show2FA) {
                setShow2FA(true);
              } else {
                navigate("/admin/dashboard");
              }
            }}
          >
            <div>
              <label className="text-white/70 text-sm block mb-1.5">Admin email</label>
              <input
                type="email"
                placeholder="admin@earth1.one"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors pr-12"
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

            {show2FA && (
              <div>
                <label className="text-white/70 text-sm block mb-1.5">Two-factor authentication code</label>
                <input
                  type="text"
                  placeholder="6-digit code"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors tracking-widest text-center"
                />
                <p className="text-white/30 text-xs mt-1.5">Check your authenticator app or email for the code.</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white transition-colors"
              style={{ fontWeight: 600 }}
            >
              {show2FA ? "Verify & Access Dashboard" : "Continue"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/30 text-xs">
              Access issues? Contact{" "}
              <a href="mailto:security@earth1.one" className="text-white/50 hover:text-white/70 transition-colors">
                security@earth1.one
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
