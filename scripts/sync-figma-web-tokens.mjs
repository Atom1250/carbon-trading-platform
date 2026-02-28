import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const sourcePath = resolve(root, 'apps/web-app/design/tokens/figma.tokens.json');
const outputPath = resolve(root, 'apps/web-app/src/styles/figma-tokens.css');

const tokens = JSON.parse(readFileSync(sourcePath, 'utf8'));

function toCssVars(record) {
  return Object.entries(record)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n');
}

const light = tokens.color?.light ?? {};
const dark = tokens.color?.dark ?? {};

const css = `/* Auto-generated from apps/web-app/design/tokens/figma.tokens.json. Do not edit manually. */
:root {
${toCssVars(light)}
  --radius: ${tokens.radius?.base ?? '0.75rem'};
  --font-size: ${tokens.typography?.fontSize ?? '16px'};
  --font-family-base: ${tokens.typography?.fontFamily ?? '"Manrope", "IBM Plex Sans", "Segoe UI", sans-serif'};
  --spacing-grid: ${tokens.spacing?.grid ?? 8}px;
}

.dark {
${toCssVars(dark)}
}
`;

writeFileSync(outputPath, css, 'utf8');
console.log(`Synced tokens to ${outputPath}`);
