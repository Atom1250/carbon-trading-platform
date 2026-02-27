#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const mappingPath = path.join(repoRoot, "apps/web-app/figma-landing-mapping.json");

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

const requiredFrames = [
  "LND-01 Dashboard",
  "LND-02 Dashboard (Project Owner)",
  "LND-03 Dashboard (Investor)",
  "LND-04 Dashboard (Carbon Trader)",
  "LND-05 Dashboard (Admin)",
  "NAV-01 Sidebar",
  "NAV-02 Breadcrumbs",
  "NAV-03 Command Palette",
];

const requiredRoutes = [
  "/dashboard",
  "/owner",
  "/owner/projects/new",
  "/investor",
  "/investor/search",
  "/trading",
  "/onboarding/start",
  "/admin/dashboard",
];

const requiredComponents = [
  "C-SidebarNav",
  "C-Breadcrumbs",
  "C-CommandPaletteModal",
  "C-HeroStartHere",
  "C-QuickActionsPanel",
  "C-RecentPanel",
  "C-WorkQueuePanel",
  "C-PlatformHealthPanel",
  "C-PageHeader",
  "C-UserContextChip",
];

if (!Array.isArray(mapping?.frames)) fail("mapping.frames must be an array");
if (!Array.isArray(mapping?.routes)) fail("mapping.routes must be an array");
if (!Array.isArray(mapping?.components)) fail("mapping.components must be an array");

const frameSet = new Set((mapping.frames ?? []).map((f) => f.frameName));
for (const frame of requiredFrames) {
  if (!frameSet.has(frame)) fail(`missing frame mapping: ${frame}`);
}

const routeSet = new Set((mapping.routes ?? []).map((r) => r.route));
for (const route of requiredRoutes) {
  if (!routeSet.has(route)) fail(`missing route mapping: ${route}`);
}

const componentSet = new Set((mapping.components ?? []).map((c) => c.name));
for (const component of requiredComponents) {
  if (!componentSet.has(component)) fail(`missing component mapping: ${component}`);
}

const codeTargets = [
  mapping?.userContext?.typesCodeTarget,
  mapping?.userContext?.resolverCodeTarget,
  mapping?.userContext?.navConfigTarget,
  mapping?.userContext?.navTypesTarget,
  ...(mapping.frames ?? []).map((f) => f.codeTarget),
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

console.log("figma-landing-mapping.json is valid");
