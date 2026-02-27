import { ListingCard } from "@/components/trading/ListingCard";
import type { CreditListing } from "@/lib/trading/types";

export function CreditListingCard({ listing, score }: { listing: CreditListing; score?: number }) {
  return <ListingCard listing={listing} score={score} />;
}
