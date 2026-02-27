"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { QATemplateKey, QAThread } from "@/lib/investor/types";

export function QAThreadView({
  thread,
  onAsk,
  preset,
}: {
  thread: QAThread;
  onAsk: (question: string, templateKey?: QATemplateKey) => Promise<void>;
  preset?: { templateKey?: QATemplateKey; question?: string };
}) {
  const [q, setQ] = useState(preset?.question ?? "");
  const [templateKey, setTemplateKey] = useState<QATemplateKey | undefined>(preset?.templateKey);
  const [sending, setSending] = useState(false);

  const items = useMemo(() => thread.items ?? [], [thread.items]);

  async function submit() {
    if (!q.trim()) return;
    setSending(true);
    try {
      await onAsk(q.trim(), templateKey);
      setQ("");
      setTemplateKey(undefined);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Ask a question</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {templateKey && (
            <div className="text-sm text-muted-foreground">
              Using template: <span className="font-medium text-foreground">{templateKey}</span>
            </div>
          )}
          <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type your question..." />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={sending || !q.trim()}>{sending ? "Sending..." : "Send"}</Button>
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([JSON.stringify(thread, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `qa-${thread.projectId}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Q&A (JSON)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Thread</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {items.length === 0 && <div className="text-muted-foreground">No questions yet.</div>}
          {items.map((it) => (
            <div key={it.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{it.question}</div>
                <div className="text-xs text-muted-foreground">{it.status}</div>
              </div>
              <div className="text-xs text-muted-foreground">Asked by {it.askedBy.name} | {new Date(it.askedAt).toLocaleString()}</div>
              {it.answer && (
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-sm">{it.answer.text}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Answered by {it.answer.answeredBy.name} | {new Date(it.answer.answeredAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
