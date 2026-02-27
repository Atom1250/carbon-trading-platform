import { z } from "zod";

export const InvestorMandateSchema = z
  .object({
    name: z.string().min(2).max(80),
    categories: z.array(z.enum(["RENEWABLE_ENERGY", "GREEN_INFRASTRUCTURE", "BIODIVERSITY"])) .min(1),
    subtypes: z.array(z.string().min(2).max(60)).optional(),
    countriesAllowed: z.array(z.string().min(2).max(60)).optional(),
    countriesExcluded: z.array(z.string().min(2).max(60)).optional(),
    stagesAllowed: z.array(z.enum(["CONCEPT", "FEASIBILITY", "PERMITTED", "READY_TO_BUILD", "CONSTRUCTION", "OPERATING"])) .min(1),
    ticketMin: z.number().nonnegative().optional(),
    ticketMax: z.number().nonnegative().optional(),
    currency: z.string().min(3).max(3).optional(),
    instruments: z.array(z.enum(["SENIOR_SECURED_LOAN", "SENIOR_UNSECURED_LOAN", "MEZZANINE_LOAN", "EQUITY", "BLENDED"])) .min(1),
    tenorMinYears: z.number().nonnegative().optional(),
    tenorMaxYears: z.number().nonnegative().optional(),
    couponMinPct: z.number().min(0).max(100).optional(),
    couponMaxPct: z.number().min(0).max(100).optional(),
    dscrMin: z.number().min(0).optional(),
    creditsRequired: z.boolean(),
    minAnnualCreditsTco2e: z.number().nonnegative().optional(),
    preferredStandards: z.array(z.string().min(2).max(40)).optional(),
    vintagePrefs: z.array(z.string().min(4).max(10)).optional(),
    weights: z
      .object({
        match: z.number().min(0).max(1),
        readiness: z.number().min(0).max(1),
        return: z.number().min(0).max(1),
        impact: z.number().min(0).max(1),
        risk: z.number().min(0).max(1),
      })
      .refine((w) => {
        const s = w.match + w.readiness + w.return + w.impact + w.risk;
        return s > 0.99 && s < 1.01;
      }, "Weights must sum to 1.0"),
  })
  .superRefine((v, ctx) => {
    if (v.ticketMin !== undefined && v.ticketMax !== undefined && v.ticketMin > v.ticketMax) {
      ctx.addIssue({ code: "custom", path: ["ticketMax"], message: "Max ticket must be >= min ticket." });
    }
    if (v.tenorMinYears !== undefined && v.tenorMaxYears !== undefined && v.tenorMinYears > v.tenorMaxYears) {
      ctx.addIssue({ code: "custom", path: ["tenorMaxYears"], message: "Max tenor must be >= min tenor." });
    }
    if (v.creditsRequired && v.minAnnualCreditsTco2e === undefined) {
      ctx.addIssue({ code: "custom", path: ["minAnnualCreditsTco2e"], message: "Minimum annual credits required when creditsRequired is enabled." });
    }
  });

export type InvestorMandateInput = z.infer<typeof InvestorMandateSchema>;
