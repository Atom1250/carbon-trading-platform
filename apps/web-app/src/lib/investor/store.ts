"use client";

import { create } from "zustand";
import type { InvestorMandate, InvestorProjectCardModel } from "@/lib/investor/types";

type State = {
  mandate?: InvestorMandate;
  results: InvestorProjectCardModel[];
  quickFilters: {
    category?: string;
    country?: string;
    stage?: string;
    ndaFreeOnly?: boolean;
    creditsOnly?: boolean;
  };
  setMandate: (m: InvestorMandate) => void;
  setResults: (r: InvestorProjectCardModel[]) => void;
  setQuickFilters: (q: Partial<State["quickFilters"]>) => void;
};

export const useInvestorStore = create<State>((set) => ({
  mandate: undefined,
  results: [],
  quickFilters: {},
  setMandate: (m) => set({ mandate: m }),
  setResults: (r) => set({ results: r }),
  setQuickFilters: (q) => set((s) => ({ quickFilters: { ...s.quickFilters, ...q } })),
}));
