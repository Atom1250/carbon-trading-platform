import { FigmaListItem, FigmaPage, FigmaPanel } from "@/components/figma/FigmaPortalPrimitives";

export default function JoinInstitution() {
  return (
    <FigmaPage title="Join an Institution" subtitle="Link your user profile to an approved institution onboarding case.">
      <FigmaPanel title="Invite and Verification" subtitle="Use secure invite codes from institution admins.">
        <div className="space-y-2">
          <FigmaListItem title="Step 1: Enter Invite Code" body="Paste institution invite token and verify tenancy scope." />
          <FigmaListItem title="Step 2: Confirm Legal Identity" body="Match user legal name and role with institution records." />
          <FigmaListItem title="Step 3: Continue Personal KYC" body="Proceed to personal onboarding workflow and document upload." />
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
