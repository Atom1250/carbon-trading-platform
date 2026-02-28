import { redirect } from "next/navigation";

export default function ProjectOwnerProjectDetailAlias({ params }: { params: { projectId: string } }) {
  redirect(`/owner/projects/${params.projectId}`);
}
