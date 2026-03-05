import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";

export default function OnboardingStart() {
  return (
    <FigmaPage title="Client Onboarding" subtitle="Entry point for institutional and personal KYC onboarding flows.">
      <FigmaStatGrid
        stats={[
          { key: "tracks", label: "Onboarding Tracks", value: "2" },
          { key: "entity", label: "Institutional KYC", value: "Enabled" },
          { key: "individual", label: "Personal KYC", value: "Enabled" },
          { key: "compliance", label: "Compliance Readiness", value: "Active" },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FigmaPanel title="Institutional Client" subtitle="Entity onboarding for legal, ownership, and governance checks.">
          <div className="space-y-3 text-sm text-white/75">
            <p>Create an institutional onboarding case for entity KYC/AML, beneficial ownership, roster, and documents.</p>
            <Button asChild className="mt-2">
              <Link href="/onboarding/institution/new">Start Institutional Onboarding</Link>
            </Button>
          </div>
        </FigmaPanel>

        <FigmaPanel title="Personal User" subtitle="Individual onboarding linked to institution-level approval.">
          <div className="space-y-3 text-sm text-white/75">
            <p>Join an institution via invite code and complete your personal KYC profile.</p>
            <div className="mt-2 flex gap-2">
              <Button asChild variant="secondary">
                <Link href="/onboarding/person/join">Join Institution</Link>
              </Button>
              <Button asChild>
                <Link href="/onboarding/person/new">Start Personal KYC</Link>
              </Button>
            </div>
          </div>
        </FigmaPanel>
      </div>
    </FigmaPage>
  );
}
