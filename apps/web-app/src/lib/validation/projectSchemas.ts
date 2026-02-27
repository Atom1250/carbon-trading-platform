import { z } from "zod";

export const DealSnapshotSchema = z.object({
  name: z.string().min(3).max(80),
  category: z.enum(["RENEWABLE_ENERGY", "GREEN_INFRASTRUCTURE", "BIODIVERSITY"]),
  subtype: z.string().min(2).max(60),
  country: z.string().min(2).max(60),
  region: z.string().max(60).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  stage: z.enum(["CONCEPT", "FEASIBILITY", "PERMITTED", "READY_TO_BUILD", "CONSTRUCTION", "OPERATING"]),
  fundingAsk: z.object({
    instrument: z.array(z.enum(["EQUITY", "DEBT", "BLENDED", "GRANT"])).min(1),
    amount: z.number().positive(),
    currency: z.string().min(3).max(3).default("USD"),
    minTicket: z.number().nonnegative().optional(),
    targetCloseDate: z.string().min(4),
  }),
  ndaRequired: z.boolean().default(true),
});

export type DealSnapshotInput = z.infer<typeof DealSnapshotSchema>;
