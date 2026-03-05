import { FigmaListItem, FigmaPage, FigmaPanel } from "@/components/figma/FigmaPortalPrimitives";

export default function OwnerSettingsPage() {
  return (
    <FigmaPage title="Owner Settings" subtitle="Configure notifications, default data-sharing policy, and portal preferences.">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <FigmaPanel title="Notification Preferences" subtitle="Email and in-app routing for diligence and task events.">
          <div className="space-y-2">
            <FigmaListItem title="Diligence Thread Alerts" meta="Enabled" />
            <FigmaListItem title="Readiness Status Changes" meta="Enabled" />
            <FigmaListItem title="Daily Summary Digest" meta="Enabled (08:00 local)" />
          </div>
        </FigmaPanel>

        <FigmaPanel title="Data Sharing Defaults" subtitle="Project-level defaults applied on new documents.">
          <div className="space-y-2">
            <FigmaListItem title="Default Visibility" meta="Dataroom" />
            <FigmaListItem title="External Share Review" meta="Required" />
            <FigmaListItem title="Version Lock on Publish" meta="Enabled" />
          </div>
        </FigmaPanel>
      </div>
    </FigmaPage>
  );
}
