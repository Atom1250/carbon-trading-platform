"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QATemplateKey } from "@/lib/investor/types";

export function QATemplatesPanel({
  templates,
  onSelectTemplate,
}: {
  templates: Record<string, string[]>;
  onSelectTemplate: (k: QATemplateKey, q: string) => void;
}) {
  const keys = Object.keys(templates) as QATemplateKey[];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Question Templates</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {keys.map((k) => (
          <div key={k} className="space-y-2 rounded-md border p-3">
            <div className="font-medium">{k}</div>
            <div className="space-y-1">
              {templates[k].slice(0, 3).map((q, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2">
                  <div className="text-muted-foreground">{q}</div>
                  <Button size="sm" variant="secondary" onClick={() => onSelectTemplate(k, q)}>Use</Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
