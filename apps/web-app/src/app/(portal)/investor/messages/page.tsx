"use client";

import { useEffect, useMemo, useState } from "react";
import { QATemplatesPanel } from "@/components/investor/qa/QATemplatesPanel";
import { QAThreadView } from "@/components/investor/qa/QAThreadView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Investor Q&A</h1>
        <div className="text-sm text-muted-foreground">Project: {projectId}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <QATemplatesPanel templates={templates} onSelectTemplate={(k, q) => setPreset({ templateKey: k, question: q })} />
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Structured Q&A (TODO)</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Add per-question status workflow, SLA, tagging, and attachment linkage to dataroom docs.</CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <QAThreadView thread={thread} onAsk={onAsk} preset={preset} />
        </div>
      </div>
    </div>
  );
}
