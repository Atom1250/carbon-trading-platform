# Figma to Code Contract

## Source of truth
- Design tokens source: `apps/web-app/design/tokens/figma.tokens.json`
- Generated CSS vars: `apps/web-app/src/styles/figma-tokens.css`
- Component/frame mapping: `apps/web-app/figma-component-contract.json`

## Sync command
Run from repo root:

```bash
node scripts/sync-figma-web-tokens.mjs
```

## Rules
- Update token JSON when Figma variables change.
- Re-run sync command and commit both source + generated file.
- Keep frame names and `C-*` component names stable in Figma to preserve mapping.
