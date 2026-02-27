export function Progress({ value = 0 }: { value?: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 w-full rounded-full bg-primary/20">
      <div className="h-2 rounded-full bg-primary" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
