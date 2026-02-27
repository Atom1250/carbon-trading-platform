# Figma Design Spec - KYC/AML Onboarding (Institution + Personal + Admin)

## Frame Naming
- ONB-01 Start
- ONB-02 Inst Profile
- ONB-03 Inst RiskPurpose
- ONB-04 Inst Ownership
- ONB-05 Inst Individuals
- ONB-06 Inst Documents
- ONB-07 Inst ReviewSubmit
- ONB-08 Inst Status
- ONB-09 Person Join
- ONB-10 Person Wizard
- ONB-11 Person Status
- ADM-ONB-12 Queue
- ADM-ONB-13 Case Review
- ADM-ONB-14 Policies

## Route Mapping
- /onboarding/start -> ONB-01
- /onboarding/institution/new -> ONB-02..07
- /onboarding/institution/[caseId]/status -> ONB-08
- /onboarding/person/join -> ONB-09
- /onboarding/person/new -> ONB-10
- /onboarding/person/[caseId]/status -> ONB-11
- /admin/onboarding -> ADM-ONB-12
- /admin/onboarding/[caseId] -> ADM-ONB-13
- /admin/onboarding/policies -> ADM-ONB-14

## Core Components
- C-Stepper
- C-StatusBanner
- C-BlockersPanel
- C-UploadTile
- C-PersonRow
- C-DecisionBar
- C-DocReviewRow
