"use client";

import { useMemo, useState } from "react";
import { ListingCard } from "@/components/trading/ListingCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CreditListing } from "@/lib/trading/types";

function scoreListing(listing: CreditListing): number {
  const spread = listing.indicativePricing.rangeHigh - listing.indicativePricing.rangeLow;
  const spreadPct = spread / Math.max(0.01, listing.indicativePricing.mid);

  let score = 0;
  if (listing.sellers.proofOfInventory === "VERIFIED") score += 30;
  if (listing.sellers.kycBadge) score += 20;
  score += Math.max(0, 20 - spreadPct * 100);
  score += Math.min(15, listing.totalQty / 10000);
  score += Math.min(15, 10000 / Math.max(1, listing.minLot));

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function MarketplaceExplorer({ listings }: { listings: CreditListing[] }) {
  const [standard, setStandard] = useState("");
  const [category, setCategory] = useState("");
  const [vintage, setVintage] = useState("");
  const [country, setCountry] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [targetLot, setTargetLot] = useState("");

  const filtered = useMemo(() => {
    const minPriceNum = minPrice ? Number(minPrice) : undefined;
    const maxPriceNum = maxPrice ? Number(maxPrice) : undefined;
    const vintageNum = vintage ? Number(vintage) : undefined;
    const targetLotNum = targetLot ? Number(targetLot) : undefined;

    return listings
      .filter((l) => (standard ? l.standard === standard : true))
      .filter((l) => (category ? l.category === category : true))
      .filter((l) => (country ? l.location === country : true))
      .filter((l) => (vintageNum ? l.vintages.includes(vintageNum) : true))
      .filter((l) => (minPriceNum !== undefined ? l.indicativePricing.mid >= minPriceNum : true))
      .filter((l) => (maxPriceNum !== undefined ? l.indicativePricing.mid <= maxPriceNum : true))
      .filter((l) => (targetLotNum !== undefined ? l.minLot <= targetLotNum : true))
      .sort((a, b) => scoreListing(b) - scoreListing(a));
  }, [category, country, listings, maxPrice, minPrice, standard, targetLot, vintage]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1">
            <div className="text-muted-foreground">Standard</div>
            <select className="h-10 w-full rounded-md border border-border bg-background px-3" value={standard} onChange={(e) => setStandard(e.target.value)}>
              <option value="">All</option>
              <option value="VERRA">VERRA</option>
              <option value="Gold Standard">Gold Standard</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-muted-foreground">Category</div>
            <select className="h-10 w-full rounded-md border border-border bg-background px-3" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All</option>
              <option value="REMOVAL">Removal</option>
              <option value="AVOIDANCE">Avoidance</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-muted-foreground">Vintage</div>
            <Input placeholder="e.g. 2027" value={vintage} onChange={(e) => setVintage(e.target.value)} />
          </label>

          <label className="space-y-1">
            <div className="text-muted-foreground">Country</div>
            <select className="h-10 w-full rounded-md border border-border bg-background px-3" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">All</option>
              <option value="Portugal">Portugal</option>
              <option value="Mozambique">Mozambique</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-muted-foreground">Price Min</div>
            <Input type="number" placeholder="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </label>

          <label className="space-y-1">
            <div className="text-muted-foreground">Price Max</div>
            <Input type="number" placeholder="100" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </label>

          <label className="space-y-1">
            <div className="text-muted-foreground">Target Lot Size</div>
            <Input type="number" placeholder="e.g. 5000" value={targetLot} onChange={(e) => setTargetLot(e.target.value)} />
          </label>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">Results: {filtered.length}</div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((l) => (
          <ListingCard key={l.id} listing={l} score={scoreListing(l)} />
        ))}
      </div>
    </div>
  );
}

