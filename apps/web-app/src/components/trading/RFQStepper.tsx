export function RFQStepper({ steps, active }: { steps: string[]; active: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((s, i) => (
        <div key={s} className={`rounded-md border px-3 py-1.5 text-sm ${i === active ? "bg-muted font-medium" : "text-muted-foreground"}`}>
          {i + 1}. {s}
        </div>
      ))}
    </div>
  );
}
