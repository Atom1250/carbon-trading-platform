import { z } from "zod";

export const InstitutionProfileSchema = z
  .object({
    legalName: z.string().min(2).max(120),
    tradingName: z.string().max(120).optional(),
    registrationNumber: z.string().min(2).max(80),
    incorporationDate: z.string().optional(),
    legalForm: z.string().max(80).optional(),
    countryOfIncorporation: z.string().min(2).max(60),
    registeredAddress: z.string().min(5).max(240),
    principalPlaceOfBusiness: z.string().max(240).optional(),
    website: z.string().url().optional(),
    regulated: z.boolean(),
    regulatorName: z.string().max(120).optional(),
    licenseType: z.string().max(80).optional(),
    licenseNumber: z.string().max(80).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.regulated) {
      if (!v.regulatorName) ctx.addIssue({ code: "custom", path: ["regulatorName"], message: "Regulator name is required." });
      if (!v.licenseNumber) ctx.addIssue({ code: "custom", path: ["licenseNumber"], message: "License number is required." });
    }
  });

export const BusinessPurposeSchema = z.object({
  industry: z.string().min(2).max(80),
  purposeOfRelationship: z.string().min(5).max(400),
  expectedProducts: z.array(z.string().min(2).max(60)).min(1),
  expectedAnnualVolume: z.number().nonnegative().optional(),
  expectedTicketSize: z.number().nonnegative().optional(),
  operatingCountries: z.array(z.string().min(2).max(60)).optional(),
  sourceOfFunds: z.string().max(400).optional(),
  sourceOfWealth: z.string().max(400).optional(),
});

export const PersonKycSchema = z.object({
  fullName: z.string().min(2).max(120),
  dateOfBirth: z.string().min(4),
  nationality: z.array(z.string().min(2).max(60)).min(1),
  residentialAddress: z.string().min(5).max(240),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  roles: z.array(z.enum(["BENEFICIAL_OWNER", "DIRECTOR", "SIGNATORY", "PLATFORM_USER"])) .min(1),
  pepDeclared: z.boolean(),
  id: z.object({
    type: z.enum(["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"]),
    number: z.string().min(2).max(80),
    issuingCountry: z.string().min(2).max(60),
    expiry: z.string().min(4),
  }),
});

export const EntityOwnerSchema = z.object({
  legalName: z.string().min(2).max(120),
  registrationNumber: z.string().min(2).max(80),
  countryOfIncorporation: z.string().min(2).max(60),
});

export const OwnershipEdgeSchema = z.object({
  from: z.object({ kind: z.enum(["PERSON", "ENTITY"]), refId: z.string().min(1) }),
  to: z.object({ kind: z.enum(["PERSON", "ENTITY"]), refId: z.string().min(1) }),
  ownershipPct: z.number().min(0).max(100).optional(),
  controlType: z.enum(["OWNERSHIP", "VOTING", "CONTROL_OTHER"]).optional(),
});

export const InstitutionOnboardingDraftSchema = z.object({
  institution: InstitutionProfileSchema,
  business: BusinessPurposeSchema,
  people: z.array(z.object({ id: z.string().min(1), profile: PersonKycSchema })),
  entities: z.array(z.object({ id: z.string().min(1), profile: EntityOwnerSchema })),
  ownership: z.array(OwnershipEdgeSchema),
  attestations: z
    .object({
      accurateInfo: z.boolean(),
      authorityToSubmit: z.boolean(),
      consentScreening: z.boolean(),
    })
    .optional(),
});

export type InstitutionOnboardingDraft = z.infer<typeof InstitutionOnboardingDraftSchema>;
