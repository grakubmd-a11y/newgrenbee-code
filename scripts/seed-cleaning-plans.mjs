/**
 * scripts/seed-cleaning-plans.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds /membershipPlans with the three home cleaning membership plans:
 *   Basic Care · Home Care · Premium Care (by-quote)
 *
 * Usage:
 *   node scripts/seed-cleaning-plans.mjs \
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

const now = new Date().toISOString();

function tier(priceLabel, price, customQuote = false) {
  return { priceLabel, price, ...(customQuote ? { customQuote: true } : {}) };
}

// ─── First Clean Reset (shared) ───────────────────────────────────────────────
const cleaningFirstVisit = {
  required: true,
  label: "First Clean Reset",
  description:
    "If your home hasn't been professionally cleaned recently or needs extra attention, a one-time First Clean Reset fee applies before regular membership pricing begins.",
  pricing: {
    small:  tier("$199",       199),
    medium: tier("$279",       279),
    large:  tier("$399–$499",  399),
    xl:     tier("Custom quote", 0, true),
  },
};

// ─── Cleaning Plans ───────────────────────────────────────────────────────────
const CLEANING_PLANS = [
  {
    id: "cleaning-basic",
    type: "cleaning",
    name: "Basic Care",
    tagline: "Reliable bi-weekly cleaning — keep your home consistently fresh.",
    visitsPerMonth: 2,
    frequencyLabel: "Bi-weekly",
    features: [
      "2 full home cleaning visits per month",
      "Kitchen (countertops, sink, exterior of appliances)",
      "Bathrooms (toilet, shower/tub, vanity, mirrors)",
      "Vacuuming & mopping all floors",
      "Dusting furniture, shelves & surfaces",
      "Consistent team assignment (when available)",
      "Weather / illness reschedule at no charge",
    ],
    notIncluded: [
      "Laundry or dishes",
      "Interior oven / fridge deep-cleaning",
      "Exterior window washing",
      "Move-in / move-out or post-construction cleans",
      "Carpet shampooing",
    ],
    pricing: {
      small:  tier("$129", 129),
      medium: tier("$169", 169),
      large:  tier("$229", 229),
      xl:     tier("Custom quote", 0, true),
    },
    firstVisit: cleaningFirstVisit,
    order: 1,
    active: true,
    byQuote: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "cleaning-home",
    type: "cleaning",
    name: "Home Care",
    tagline: "Weekly cleaning + service credits — for a home that's always ready.",
    visitsPerMonth: 4,
    frequencyLabel: "Weekly",
    features: [
      "4 full home cleaning visits per month",
      "Kitchen (countertops, sink, exterior of appliances)",
      "Bathrooms (toilet, shower/tub, vanity, mirrors)",
      "Vacuuming & mopping all floors",
      "Dusting furniture, shelves & surfaces",
      "$50/mo service credits for add-ons (max $100 balance)",
      "Priority scheduling",
      "Consistent team assignment (when available)",
      "Weather / illness reschedule at no charge",
    ],
    notIncluded: [
      "Laundry or dishes",
      "Interior oven / fridge deep-cleaning",
      "Exterior window washing",
      "Move-in / move-out or post-construction cleans",
      "Carpet shampooing",
    ],
    pricing: {
      small:  tier("$249", 249),
      medium: tier("$329", 329),
      large:  tier("$449", 449),
      xl:     tier("Custom quote", 0, true),
    },
    firstVisit: cleaningFirstVisit,
    credits: {
      monthlyAmount: 50,
      maxBalance: 100,
      expiryDays: 60,
    },
    order: 2,
    active: true,
    byQuote: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "cleaning-premium",
    type: "cleaning",
    name: "Premium Care",
    tagline: "Full-service weekly deep cleaning + dedicated team + maximum credits.",
    visitsPerMonth: 4,
    frequencyLabel: "Weekly",
    features: [
      "Weekly comprehensive deep-clean visit",
      "Full home + deep-clean rotation each visit",
      "Dedicated cleaning team assigned to your home",
      "$100/mo service credits for add-ons (max $200 balance)",
      "Priority & same-week scheduling",
      "Preferred technician guarantee",
    ],
    notIncluded: [],
    pricing: {
      small:  tier("$499", 499),
      medium: tier("$649", 649),
      large:  tier("$899", 899),
      xl:     tier("Custom quote", 0, true),
    },
    firstVisit: cleaningFirstVisit,
    credits: {
      monthlyAmount: 100,
      maxBalance: 200,
      expiryDays: 60,
    },
    order: 3,
    active: true,
    byQuote: true,   // Launch as "By Quote" — not yet self-serve
    createdAt: now,
    updatedAt: now,
  },
];

// ─── Write ────────────────────────────────────────────────────────────────────
console.log(`\n🌿  ${dryRun ? "[DRY RUN] " : ""}Seeding ${CLEANING_PLANS.length} cleaning membership plans\n`);

for (const plan of CLEANING_PLANS) {
  const priceStr = plan.byQuote
    ? "(by-quote card)"
    : `Small:${plan.pricing.small.priceLabel} · Med:${plan.pricing.medium.priceLabel} · Lg:${plan.pricing.large.priceLabel}`;
  console.log(`  ${dryRun ? "🔍" : "✏️ "}  ${plan.id}  [${plan.frequencyLabel}]  ${priceStr}`);
  if (!dryRun) {
    await db.collection("membershipPlans").doc(plan.id).set(plan);
  }
}

console.log(`\n✅  Done.\n`);
