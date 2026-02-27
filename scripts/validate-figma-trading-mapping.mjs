#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const mappingPath = path.join(repoRoot, "apps/web-app/figma-trading-mapping.json");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(mappingPath)) {
  fail(`mapping file not found: ${mappingPath}`);
  process.exit();
}

let mapping;
try {
  mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
} catch (error) {
  fail(`invalid JSON in mapping file: ${error.message}`);
  process.exit();
}

const requiredRoutes = [
  "/trading",
  "/trading/listings/[listingId]",
  "/trading/rfq/new",
  "/trading/rfq/[rfqId]",
  "/trading/quotes",
  "/trading/trades",
  "/trading/trades/[tradeId]",
  "/trading/positions",
  "/trading/retirements",
];

const requiredComponents = [
  "CreditListingCard",
  "IndicativePriceChip",
  "AvailabilityChip",
  "AttributeBadges",
  "FilterBarQuick",
  "FilterDrawerAdvanced",
  "RFQStepper",
  "QuoteCard",
  "BlotterTable",
  "SettlementTimeline",
  "EvidenceUploadTile",
  "PositionLotRow",
  "RetirementForm",
];

if (!Array.isArray(mapping?.routes)) fail("mapping.routes must be an array");
if (!Array.isArray(mapping?.components)) fail("mapping.components must be an array");

const routeSet = new Set((mapping.routes ?? []).map((r) => r.route));
for (const route of requiredRoutes) {
  if (!routeSet.has(route)) fail(`missing route mapping: ${route}`);
}

const componentSet = new Set((mapping.components ?? []).map((c) => c.name));
for (const name of requiredComponents) {
  if (!componentSet.has(name)) fail(`missing component mapping: ${name}`);
}

const codeTargets = [
  mapping?.types?.codeTarget,
  mapping?.api?.codeTarget,
  ...(mapping.routes ?? []).map((r) => r.codeTarget),
  ...(mapping.components ?? []).map((c) => c.codeTarget),
].filter(Boolean);

for (const codeTarget of codeTargets) {
  const full = path.join(repoRoot, "apps/web-app", codeTarget.replace(/^src\//, "src/"));
  if (!fs.existsSync(full)) {
    fail(`code target does not exist: ${codeTarget}`);
  }
}

if (process.exitCode === 1) {
  process.exit();
}

console.log("figma-trading-mapping.json is valid");
