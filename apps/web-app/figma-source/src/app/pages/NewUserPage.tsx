import { Link } from "react-router";
import { ArrowLeft, User, Upload, CheckCircle, FileText, AlertCircle, X, ChevronDown, Eye, EyeOff, Search } from "lucide-react";
import { useState, useRef } from "react";

const registeredInstitutions = [
  { id: "inst_001", name: "Green Capital Partners Ltd", type: "Asset Manager", country: "United Kingdom" },
  { id: "inst_002", name: "Meridian Development Finance", type: "Development Finance Institution", country: "United States" },
  { id: "inst_003", name: "Pacific Sustainability Fund", type: "Asset Manager", country: "Australia" },
  { id: "inst_004", name: "Verdant Infrastructure SA", type: "Project Developer", country: "France" },
  { id: "inst_005", name: "Atlas Carbon Brokerage", type: "Carbon Brokerage", country: "Singapore" },
  { id: "inst_006", name: "Nordic Climate Investment AB", type: "Pension Fund", country: "Sweden" },
  { id: "inst_007", name: "Horizon Impact Fund LLC", type: "Asset Manager", country: "United States" },
  { id: "inst_008", name: "Sahara Renewables Group", type: "Project Developer", country: "South Africa" },
  { id: "inst_009", name: "Kinesis Insurance plc", type: "Insurance Company", country: "United Kingdom" },
  { id: "inst_010", name: "AsiaPac Green Bank", type: "Commercial Bank", country: "Singapore" },
];

const kycDocs = [
  { id: "govt_id", label: "Government-Issued Photo ID", desc: "Passport, national identity card or driver's licence (valid, not expired).", required: true },
  { id: "proof_addr", label: "Proof of Address", desc: "Utility bill, bank statement or official correspondence dated within 3 months.", required: true },
  { id: "selfie", label: "Selfie with Photo ID", desc: "A clear photo of yourself holding your ID beside your face.", required: true },
  { id: "linkedin", label: "LinkedIn Profile Screenshot", desc: "Optional — helps verify your professional background.", required: false },
];

const portalRoles = [
  { id: "project_owner", label: "Project Owner", desc: "Register and manage climate projects." },
  { id: "funder", label: "Funder / Investor", desc: "Access investment pipeline and project details." },
  { id: "carbon_trader", label: "Carbon Trader", desc: "Trade carbon credits on live markets." },
];

type UploadedFile = { name: string; size: string };

export function NewUserPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedInst, setSelectedInst] = useState<typeof registeredInstitutions[0] | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploads, setUploads] = useState<Record<string, UploadedFile>>({});
  const [submitted, setSubmitted] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const filtered = registeredInstitutions.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.type.toLowerCase().includes(search.toLowerCase()) ||
      i.country.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileChange = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeKB = file.size / 1024;
      const size = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB.toFixed(0)} KB`;
      setUploads((prev) => ({ ...prev, [docId]: { name: file.name, size } }));
    }
  };

  const removeFile = (docId: string) => {
    setUploads((prev) => { const next = { ...prev }; delete next[docId]; return next; });
  };

  const requiredUploaded = kycDocs.filter((d) => d.required).every((d) => uploads[d.id]);

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-20 px-6 text-white">
        <div className="w-16 h-16 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-sky-400" />
        </div>
        <h2 className="text-3xl text-white mb-3" style={{ fontWeight: 700 }}>Registration Submitted</h2>
        <p className="text-white/50 text-center max-w-md mb-3" style={{ lineHeight: 1.75 }}>
          Your registration has been sent to{" "}
          <span className="text-sky-400">{selectedInst?.name}</span> and to our platform administrators for approval.
        </p>
        <p className="text-white/35 text-center max-w-md mb-8 text-sm">
          You will receive an email once your account is approved. This typically takes 1–3 business days.
        </p>
        <div className="flex gap-4">
          <Link to="/" className="px-6 py-3 rounded-full border border-white/20 text-white/70 hover:text-white transition-colors text-sm">
            Return Home
          </Link>
          <Link to="/login" className="px-6 py-3 rounded-full bg-sky-500 hover:bg-sky-400 text-[#060f1e] transition-colors text-sm" style={{ fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-16 px-6 text-white">
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-sky-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="max-w-3xl mx-auto relative">
        <Link to="/get-started" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <p className="text-sky-400 text-xs uppercase tracking-widest">New User</p>
            <h1 className="text-white text-2xl" style={{ fontWeight: 700 }}>Create Your Account</h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-10">
          {[{ n: 1, label: "Institution" }, { n: 2, label: "Personal Details" }, { n: 3, label: "KYC Docs" }].map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                step === s.n
                  ? "bg-sky-500/15 border border-sky-500/40 text-sky-400"
                  : step > s.n
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : "border border-white/10 text-white/30"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  step > s.n ? "bg-emerald-500 text-[#060f1e]" : step === s.n ? "bg-sky-500 text-[#060f1e]" : "bg-white/10 text-white/30"
                }`} style={{ fontWeight: 700 }}>
                  {step > s.n ? "✓" : s.n}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < 2 && <div className="w-6 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Institution Selection ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-white mb-2" style={{ fontWeight: 600 }}>Select Your Institution</h3>
              <p className="text-white/40 text-sm mb-5">Your account will be linked to and require approval from the institution you select.</p>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search by name, type or country…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>

              {/* Institution list */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filtered.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => { setSelectedInst(inst); setShowSearch(false); }}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                      selectedInst?.id === inst.id
                        ? "border-sky-500/50 bg-sky-500/10"
                        : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div>
                      <p className={`text-sm ${selectedInst?.id === inst.id ? "text-sky-300" : "text-white/70"}`} style={{ fontWeight: 500 }}>
                        {inst.name}
                      </p>
                      <p className="text-white/35 text-xs mt-0.5">{inst.type} · {inst.country}</p>
                    </div>
                    {selectedInst?.id === inst.id && (
                      <CheckCircle className="w-4 h-4 text-sky-400 shrink-0" />
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-6">No institutions found. <Link to="/get-started/institution" className="text-sky-400 hover:underline">Register yours first.</Link></p>
                )}
              </div>
            </div>

            {selectedInst && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-sky-500/30 bg-sky-500/5">
                <CheckCircle className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <p className="text-sky-300 text-sm" style={{ fontWeight: 500 }}>{selectedInst.name}</p>
                  <p className="text-sky-400/60 text-xs">{selectedInst.type} · {selectedInst.country}</p>
                </div>
              </div>
            )}

            <p className="text-white/30 text-xs">
              Your institution is not listed?{" "}
              <Link to="/get-started/institution" className="text-sky-400 hover:text-sky-300 transition-colors">Register it first.</Link>
            </p>

            <button
              onClick={() => setStep(2)}
              disabled={!selectedInst}
              className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#060f1e] transition-colors"
              style={{ fontWeight: 600 }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2: Personal Details ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Personal Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">First Name *</label>
                  <input type="text" placeholder="First name" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-sky-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Last Name *</label>
                  <input type="text" placeholder="Last name" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-sky-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Job Title *</label>
                  <input type="text" placeholder="e.g. Investment Manager" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-sky-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Department</label>
                  <input type="text" placeholder="e.g. Carbon Markets" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-sky-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Work Email *</label>
                  <input type="email" placeholder="you@company.com" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-sky-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Phone Number *</label>
                  <input type="tel" placeholder="+1 000 000 0000" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-sky-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Password *</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} placeholder="Min. 12 characters" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-sky-500/50 transition-colors pr-11" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Confirm Password *</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} placeholder="Repeat password" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-sky-500/50 transition-colors pr-11" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-white mb-2" style={{ fontWeight: 600 }}>Portal Access Request</h3>
              <p className="text-white/40 text-sm mb-4">Select the role(s) you are requesting access to, subject to institutional approval.</p>
              <div className="flex flex-col gap-3">
                {portalRoles.map((r) => (
                  <label key={r.id} className="flex items-start gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.02] cursor-pointer hover:border-sky-500/30 transition-all">
                    <input type="checkbox" className="accent-sky-500 mt-0.5" />
                    <div>
                      <p className="text-white/70 text-sm" style={{ fontWeight: 500 }}>{r.label}</p>
                      <p className="text-white/35 text-xs mt-0.5">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors">
                ← Back
              </button>
              <button onClick={() => setStep(3)} className="flex-1 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[#060f1e] transition-colors" style={{ fontWeight: 600 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: KYC Docs ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300/80 text-sm" style={{ lineHeight: 1.7 }}>
                <strong className="text-amber-300">Identity Verification</strong> — Documents must be legible, valid and unaltered. Accepted formats: PDF, JPG, PNG (max 10 MB per file). Required items are marked <span className="text-amber-300">*</span>.
              </p>
            </div>

            <div className="space-y-3">
              {kycDocs.map((doc) => (
                <div key={doc.id} className="p-5 rounded-xl border border-white/10 bg-white/[0.03] flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <FileText className="w-4 h-4 text-white/40" />
                      <span className="text-white/80 text-sm" style={{ fontWeight: 600 }}>
                        {doc.label}
                        {doc.required && <span className="text-sky-400 ml-1">*</span>}
                      </span>
                    </div>
                    <p className="text-white/35 text-xs pl-6">{doc.desc}</p>
                    {uploads[doc.id] && (
                      <div className="flex items-center gap-2 mt-2 pl-6">
                        <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-sky-400/80 text-xs">{uploads[doc.id].name} ({uploads[doc.id].size})</span>
                        <button onClick={() => removeFile(doc.id)} className="text-white/30 hover:text-white/60 ml-1"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <input ref={(el) => { fileRefs.current[doc.id] = el; }} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFileChange(doc.id, e)} />
                    <button
                      onClick={() => fileRefs.current[doc.id]?.click()}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
                        uploads[doc.id] ? "border-sky-500/40 bg-sky-500/10 text-sky-400" : "border-white/15 bg-white/[0.04] text-white/50 hover:border-white/30 hover:text-white/70"
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploads[doc.id] ? "Replace" : "Upload"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] text-white/40 text-xs" style={{ lineHeight: 1.75 }}>
              By submitting this application you confirm that all information is accurate, that you consent to Earth1.one processing your personal data for KYC purposes, and that your account activation is subject to approval by your institution and platform administrators.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors">
                ← Back
              </button>
              <button
                onClick={() => setSubmitted(true)}
                disabled={!requiredUploaded}
                className="flex-1 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#060f1e] transition-colors"
                style={{ fontWeight: 600 }}
              >
                Submit Registration
              </button>
            </div>
            {!requiredUploaded && <p className="text-white/35 text-xs text-center">Please upload all required (*) documents to submit.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
