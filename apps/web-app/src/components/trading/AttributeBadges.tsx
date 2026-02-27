import { Badge } from "@/components/ui/badge";

export function AttributeBadges({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Badge key={i} variant="outline">{i}</Badge>
      ))}
    </div>
  );
}
