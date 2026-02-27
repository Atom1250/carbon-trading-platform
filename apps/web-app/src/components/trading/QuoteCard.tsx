import { Badge } from "@/components/ui/badge";
import type { Quote } from "@/lib/trading/types";

export function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <div className="space-y-1 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-medium">{quote.sellerId}</div>
        <Badge variant={quote.status === "ACCEPTED" ? "secondary" : quote.status === "REJECTED" ? "destructive" : "outline"}>{quote.status}</Badge>
      </div>
      <div>{quote.currency} {quote.price} + fees {quote.fees}</div>
      <div className="text-muted-foreground">Valid until {quote.validityUntil}</div>
    </div>
  );
}
