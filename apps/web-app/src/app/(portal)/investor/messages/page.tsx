"use client";

import { useEffect, useMemo, useState } from "react";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { QATemplatesPanel } from "@/components/investor/qa/QATemplatesPanel";
import { QAThreadView } from "@/components/investor/qa/QAThreadView";
import { askQuestion, getQaThread, getQuestionTemplates } from "@/lib/investor/api";
import type { QATemplateKey, QAThread } from "@/lib/investor/types";

function getQueryParam(name: string) {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export default function InvestorMessages() {
  const projectId = useMemo(() => getQueryParam("projectId") ?? "p_001", []);
  const [thread, setThread] = useState<QAThread>({ projectId, items: [] });
  const [templates, setTemplates] = useState<Record<string, string[]>>({});
  const [preset, setPreset] = useState<{ templateKey?: QATemplateKey; question?: string }>();

  useEffect(() => {
    (async () => {
      setTemplates(await getQuestionTemplates());
      setThread(await getQaThread(projectId));
    })();
  }, [projectId]);

  async function onAsk(question: string, templateKey?: QATemplateKey) {
    await askQuestion(projectId, question, templateKey);
    setThread(await getQaThread(projectId));
  }

  return (
    <FigmaPage title="Investor Q&A" subtitle={`Project: ${projectId}`}>
      <FigmaStatGrid
        stats={[
          { key: "questions", label: "Thread Items", value: String(thread.items.length) },
          { key: "templates", label: "Template Groups", value: String(Object.keys(templates).length) },
          { key: "status", label: "Q&A Workflow", value: "Active" },
          { key: "sla", label: "SLA Tracking", value: "Planned" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <QATemplatesPanel templates={templates} onSelectTemplate={(k, q) => setPreset({ templateKey: k, question: q })} />
          <FigmaPanel className="mt-4" title="Structured Q&A (TODO)" subtitle="Lifecycle and governance enhancements.">
            <div className="text-sm text-white/75">
              Add per-question status workflow, SLA, tagging, and attachment linkage to dataroom docs.
            </div>
          </FigmaPanel>
        </div>

        <div className="xl:col-span-2">
          <QAThreadView thread={thread} onAsk={onAsk} preset={preset} />
        </div>
      </div>
    </FigmaPage>
  );
}
