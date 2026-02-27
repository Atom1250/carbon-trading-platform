import { Link, useNavigate } from "react-router";
import { ArrowLeft, Building2, Upload, CheckCircle, FileText, AlertCircle, X, ChevronDown } from "lucide-react";
import { useState, useRef } from "react";

type UploadedFile = { name: string; size: string };

const kycDocs = [
  {
    id: "cert_inc",
    label: "Certificate of Incorporation",
    desc: "Issued by the relevant government authority in your jurisdiction.",
    required: true,
  },
  {
    id: "mem_arts",
    label: "Memorandum & Articles of Association",
    desc: "Constitutive documents setting out company objects and rules.",
    required: true,
  },
  {
    id: "proof_addr",
    label: "Proof of Registered Address",
    desc: "Utility bill or bank statement dated within the last 3 months.",
    required: true,
  },
  {
    id: "bo_id",
    label: "Beneficial Owner ID",
    desc: "Government-issued photo ID for all individuals holding ≥25% ownership.",
    required: true,
  },
  {
    id: "aml_policy",
    label: "AML / CFT Policy",
    desc: "Internal policy document for anti-money laundering and counter-terrorism financing.",
    required: false,
  },
  {
    id: "board_res",
    label: "Board Resolution",
    desc: "Authorising the entity to use the Earth1.one platform and nominating signatories.",
    required: true,
  },
  {
    id: "reg_accounts",
    label: "Most Recent Audited Accounts",
    desc: "Signed financial statements from the last fiscal year.",
    required: false,
  },
];

const institutionTypes = [
  "Asset Manager",
  "Development Finance Institution",
  "Commercial Bank",
  "Insurance Company",
  "Pension Fund",
  "Corporate (Net-Zero Buyer)",
  "NGO / Non-Profit",
  "Government Agency",
  "Project Developer",
  "Carbon Brokerage",
  "Other",
];

const countries = [
  "Australia", "Brazil", "Canada", "China", "France", "Germany",
  "India", "Indonesia", "Japan", "Kenya", "Netherlands", "New Zealand",
  "Nigeria", "Norway", "Singapore", "South Africa", "Sweden",
  "United Kingdom", "United States", "Other",
];

export function NewInstitutionPage() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<Record<string, UploadedFile>>({});
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeKB = file.size / 1024;
      const size = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB.toFixed(0)} KB`;
      setUploads((prev) => ({ ...prev, [docId]: { name: file.name, size } }));
    }
  };

  const removeFile = (docId: string) => {
    setUploads((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  };

  const requiredUploaded = kycDocs
    .filter((d) => d.required)
    .every((d) => uploads[d.id]);

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-20 px-6 text-white">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-3xl text-white mb-3" style={{ fontWeight: 700 }}>Application Submitted</h2>
        <p className="text-white/50 text-center max-w-md mb-8" style={{ lineHeight: 1.75 }}>
          Your institution registration is under review. Our compliance team will verify your documents and contact your primary contact within 2–5 business days.
        </p>
        <div className="flex gap-4">
          <Link to="/" className="px-6 py-3 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors text-sm">
            Return Home
          </Link>
          <Link to="/login" className="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#060f1e] transition-colors text-sm" style={{ fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-16 px-6 text-white">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="max-w-3xl mx-auto relative">
        {/* Back */}
        <Link to="/get-started" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-emerald-400 text-xs uppercase tracking-widest">New Institution</p>
            <h1 className="text-white text-2xl" style={{ fontWeight: 700 }}>Register Your Organisation</h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-10">
          {[{ n: 1, label: "Company Details" }, { n: 2, label: "KYC Documents" }].map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              <button
                onClick={() => setStep(s.n as 1 | 2)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm transition-all ${
                  step === s.n
                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                    : "border border-white/10 text-white/40 hover:text-white/60"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === s.n ? "bg-emerald-500 text-[#060f1e]" : "bg-white/10 text-white/40"}`} style={{ fontWeight: 700 }}>
                  {s.n}
                </span>
                {s.label}
              </button>
              {i === 0 && <div className="w-8 h-px bg-white/15" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Company Details ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Company Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-white/60 text-sm block mb-1.5">Legal Company Name *</label>
                  <input type="text" placeholder="e.g. Green Capital Partners Ltd" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Company Registration Number *</label>
                  <input type="text" placeholder="e.g. 12345678" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Country of Incorporation *</label>
                  <div className="relative">
                    <select className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white/70 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none">
                      <option value="" className="bg-[#0a1628]">Select country…</option>
                      {countries.map((c) => <option key={c} className="bg-[#0a1628]">{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Institution Type *</label>
                  <div className="relative">
                    <select className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white/70 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none">
                      <option value="" className="bg-[#0a1628]">Select type…</option>
                      {institutionTypes.map((t) => <option key={t} className="bg-[#0a1628]">{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Legal Form</label>
                  <input type="text" placeholder="e.g. Private Limited Company" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-white/60 text-sm block mb-1.5">Registered Address *</label>
                  <input type="text" placeholder="Street address, city, postcode" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Website</label>
                  <input type="url" placeholder="https://yourcompany.com" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Tax / VAT Number</label>
                  <input type="text" placeholder="Optional" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Primary Contact</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Full Name *</label>
                  <input type="text" placeholder="First and last name" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Job Title *</label>
                  <input type="text" placeholder="e.g. Chief Compliance Officer" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Email Address *</label>
                  <input type="email" placeholder="contact@yourcompany.com" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1.5">Phone Number *</label>
                  <input type="tel" placeholder="+1 000 000 0000" className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-white mb-2" style={{ fontWeight: 600 }}>Platform Access</h3>
              <p className="text-white/40 text-sm mb-4">Select all roles your institution requires access to.</p>
              <div className="flex flex-wrap gap-3">
                {["Project Owner", "Funder / Investor", "Carbon Trader"].map((r) => (
                  <label key={r} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] cursor-pointer hover:border-emerald-500/30 transition-colors">
                    <input type="checkbox" className="accent-emerald-500" />
                    <span className="text-white/60 text-sm">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#060f1e] transition-colors"
              style={{ fontWeight: 600 }}
            >
              Continue to KYC Documents →
            </button>
          </div>
        )}

        {/* ── Step 2: KYC Documents ── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-amber-300/80 text-sm" style={{ lineHeight: 1.7 }}>
                <strong className="text-amber-300">KYC/AML Requirements</strong> — All documents must be clear, unaltered originals or certified copies. Accepted formats: PDF, JPG, PNG (max 10 MB per file). All required documents marked <span className="text-amber-300">*</span> must be uploaded before submission.
              </div>
            </div>

            <div className="space-y-3">
              {kycDocs.map((doc) => (
                <div key={doc.id} className="p-5 rounded-xl border border-white/10 bg-white/[0.03] flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <FileText className="w-4 h-4 text-white/40" />
                      <span className="text-white/80 text-sm" style={{ fontWeight: 600 }}>
                        {doc.label}
                        {doc.required && <span className="text-emerald-400 ml-1">*</span>}
                      </span>
                    </div>
                    <p className="text-white/35 text-xs pl-6">{doc.desc}</p>
                    {uploads[doc.id] && (
                      <div className="flex items-center gap-2 mt-2 pl-6">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400/80 text-xs">{uploads[doc.id].name} ({uploads[doc.id].size})</span>
                        <button onClick={() => removeFile(doc.id)} className="text-white/30 hover:text-white/60 transition-colors ml-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <input
                      ref={(el) => { fileRefs.current[doc.id] = el; }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleFileChange(doc.id, e)}
                    />
                    <button
                      onClick={() => fileRefs.current[doc.id]?.click()}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
                        uploads[doc.id]
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-white/15 bg-white/[0.04] text-white/50 hover:border-white/30 hover:text-white/70"
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
              By submitting this application you confirm that all information provided is accurate and complete, and that you consent to Earth1.one processing your data for KYC/AML compliance purposes in accordance with our Privacy Policy and applicable law.
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setSubmitted(true)}
                disabled={!requiredUploaded}
                className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#060f1e] transition-colors"
                style={{ fontWeight: 600 }}
              >
                Submit Application
              </button>
            </div>

            {!requiredUploaded && (
              <p className="text-white/35 text-xs text-center">
                Please upload all required (*) documents to submit.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
