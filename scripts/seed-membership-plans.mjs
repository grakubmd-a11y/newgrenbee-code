/**
 * scripts/seed-membership-plans.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds the /membershipPlans Firestore collection with the initial lawn care
 * membership plans. All prices are editable from the admin panel afterward.
 *
 * Usage:
 *   node scripts/seed-membership-plans.mjs \
 *     --serviceAccount="/path/to/service-account.json"
 *
 * Optional:
 *   --database=<id>   (default: ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1)
 *   --project=<id>    (default: servicios-maps)
 *   --dry-run
 */

import { readFile } from "node:fs/promises";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=") || true];
  })
);

const serviceAccountPath = args.serviceAccount || args["service-account"];
const databaseId = args.database || "ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1";
const projectId  = args.project  || "servicios-maps";
const dryRun     = args["dry-run"] === true || args["dry-run"] === "true";

if (!serviceAccountPath) {
  console.error("❌  --serviceAccount=/path/to/key.json is required");
  process.exit(1);
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount), projectId });
}
const db = getFirestore(databaseId);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const now = new Date().toISOString();

function tier(priceLabel, price, customQuote = false) {
  return { priceLabel, price, ...(customQuote ? { customQuote: true } : {}) };
}

// ─── First Cut Reset (shared across lawn plans) ───────────────────────────────
const lawnFirstVisit = {
  required: true,
  label: "First Cut Reset",
  description:
    "If the lawn has not been maintained recently or is overgrown, a First Cut Reset fee applies. Regular membership pricing begins after the first service.",
  pricing: {
    small:  tier("$59–$79",   59),
    medium: tier("$89–$119",  89),
    large:  tier("$139–$179", 139),
    xl:     tier("Custom quote", 0, true),
  },
};

// ─── Lawn Care Plans ──────────────────────────────────────────────────────────
const LAWN_PLANS = [
  {
    id: "lawn-basic",
    type: "lawn",
    name: "Basic Lawn",
    tagline: "Keep it tidy — one visit a month.",
    visitsPerMonth: 1,
    frequencyLabel: "1 cut / month",
    features: [
      "1 lawn mowing visit per month",
      "Edging along walkways & driveway",
      "Clipping blowoff from hard surfaces",
      "Regular maintenance schedule",
      "Priority booking 48 h in advance",
    ],
    notIncluded: [
      "Weed removal",
      "Bush / shrub trimming",
      "Debris hauling",
      "Fertilizer or treatments",
      "Overgrown or first-time cleanup",
    ],
    pricing: {
      small:  tier("$59–$79",   59),
      medium: tier("$89–$119",  89),
      large:  tier("$139–$179", 139),
      xl:     tier("Custom quote", 0, true),
    },
    firstVisit: lawnFirstVisit,
    order: 1,
    active: true,
    byQuote: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lawn-standard",
    type: "lawn",
    name: "Standard Lawn",
    tagline: "Consistent care — twice a month.",
    visitsPerMonth: 2,
    frequencyLabel: "2 cuts / month",
    features: [
      "2 lawn mowing visits per month",
      "Edging along walkways & driveway",
      "Clipping blowoff from hard surfaces",
      "Bi-weekly maintenance schedule",
      "Priority booking 24 h in advance",
      "10% off additional lawn add-ons",
    ],
    notIncluded: [
      "Weed removal",
      "Bush / shrub trimming",
      "Debris hauling",
      "Fertilizer or treatments",
      "Overgrown cleanup",
    ],
    pricing: {
      small:  tier("$109–$149", 109),
      medium: tier("$169–$219", 169),
      large:  tier("$249–$329", 249),
      xl:     tier("Custom quote", 0, true),
    },
    firstVisit: lawnFirstVisit,
    order: 2,
    active: true,
    byQuote: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lawn-premium",
    type: "lawn",
    name: "Premium Lawn",
    tagline: "Always ready — weekly service.",
    visitsPerMonth: 4,
    frequencyLabel: "Weekly",
    features: [
      "Weekly lawn mowing visits",
      "Edging along walkways & driveway",
      "Clipping blowoff from hard surfaces",
      "Weekly maintenance schedule",
      "Priority & same-week booking",
      "15% off additional lawn add-ons",
      "Preferred technician when available",
    ],
    notIncluded: [
      "Weed removal",
      "Bush / shrub trimming",
      "Debris hauling",
      "Fertilizer or treatments",
      "Overgrown cleanup",
    ],
    pricing: {
      small:  tier("$199–$269", 199),
      medium: tier("$299–$399", 299),
      large:  tier("$449–$599", 449),
      xl:     tier("Custom quote", 0, true),
    },
    firstVisit: lawnFirstVisit,
    order: 3,
    active: true,
    byQuote: false,
    createdAt: now,
    updatedAt: now,
  },
  // Placeholder — Premium XL / Custom quote card
  {
    id: "lawn-custom",
    type: "lawn",
    name: "XL & Custom",
    tagline: "Large lots, slopes, complex yards or commercial properties.",
    visitsPerMonth: 0,
    frequencyLabel: "Flexible",
    features: [
      "Custom visit frequency",
      "Tailored pricing for your yard",
      "Available for large or complex properties",
      "Dedicated account manager",
    ],
    notIncluded: [],
    pricing: {
      small:  tier("Custom quote", 0, true),
      medium: tier("Custom quote", 0, true),
      large:  tier("Custom quote", 0, true),
      xl:     tier("Custom quote", 0, true),
    },
    order: 4,
    active: true,
    byQuote: true,
    createdAt: now,
    updatedAt: now,
  },
];

// ─── Yard Size Guide (stored separately for display on the page) ──────────────
const YARD_SIZE_GUIDE = [
  {
    id: "yard-guide",
    sizes: [
      { tier: "small",  label: "Small Yard",  description: "Townhome, front yard only, or compact lot", examples: "Up to ~3,500 sqft" },
      { tier: "medium", label: "Medium Yard", description: "Standard single-family home yard",           examples: "~3,500–8,000 sqft" },
      { tier: "large",  label: "Large Yard",  description: "Larger residential lot",                    examples: "~8,000–15,000 sqft" },
      { tier: "xl",     label: "XL / Custom", description: "Large lots, slopes, or complex terrain",    examples: "15,000+ sqft · custom quote" },
    ],
    updatedAt: now,
  },
];

// ─── Write ────────────────────────────────────────────────────────────────────
console.log(`\n🌿  ${dryRun ? "[DRY RUN] " : ""}Seeding ${LAWN_PLANS.length} lawn membership plans\n`);

for (const plan of LAWN_PLANS) {
  console.log(`  ${dryRun ? "🔍" : "✏️ "}  ${plan.id}  [${plan.frequencyLabel}]  ${plan.byQuote ? "(by-quote card)" : `Small:${plan.pricing.small.priceLabel} · Med:${plan.pricing.medium.priceLabel} · Lg:${plan.pricing.large.priceLabel}`}`);
  if (!dryRun) {
    await db.collection("membershipPlans").doc(plan.id).set(plan);
  }
}

console.log(`\n  ${dryRun ? "🔍" : "✏️ "}  yard-size-guide`);
if (!dryRun) {
  await db.collection("membershipConfig").doc("yard-size-guide").set(YARD_SIZE_GUIDE[0]);
}

console.log(`\n✅  Done.\n`);
