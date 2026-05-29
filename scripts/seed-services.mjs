/**
 * Seed / sync the `services` Firestore collection with the canonical SERVICES_DATA
 * defined in src/shared/data.ts.
 *
 * Usage:
 *   node scripts/seed-services.mjs --serviceAccount=/path/to/service-account.json
 *
 * Optional flags:
 *   --database=<firestoreDatabaseId>   (default: ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1)
 *   --project=<firebaseProjectId>      (default: servicios-maps)
 *   --dry-run                          (print what would be written without touching Firestore)
 */

import { readFile } from "node:fs/promises";
import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ── Parse CLI args ─────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...valueParts] = arg.replace(/^--/, "").split("=");
    return [key, valueParts.join("=")];
  })
);

const serviceAccountPath = args.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const projectId          = args.project    || "servicios-maps";
const databaseId         = args.database   || "ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1";
const dryRun             = "dry-run" in args;

// serviceAccountPath is optional — falls back to ADC (gcloud auth application-default login)

// ── SERVICES_DATA (canonical copy — keep in sync with src/shared/data.ts) ─
const SERVICES_DATA = [
  {
    id: "house-cleaning",
    name: "House Cleaning",
    iconName: "Sparkles",
    tagline: "Spotless professional cleaning for a pristine, healthy home.",
    description: "Our certified professionals use eco-friendly cleaners to deep clean your house. Every clean includes vacuuming, dusting, mopping, trash disposal, and sanitizing kitchens and bathrooms.",
    basePrice: 85,
    unitName: "extra room",
    unitLabel: "Extra Rooms (office, dining room, playroom...)",
    pricePerUnit: 25,
    minUnits: 0,
    maxUnits: 6,
    stepUnits: 1,
    estimatedMinutesPerUnit: 40,
    popularUnitValue: 0,
    includedSpecs: [
      "Dust and wipe all accessible surfaces",
      "Vacuum all carpets, rugs, and stairs",
      "Sweep and sanitize all hard-floor areas",
      "Load dishwasher or wash up to 10 sink dishes",
      "Scrub, disinfect and polish toilets, sinks, and showers",
      "Take out trash and replace liner bags",
    ],
    factors: [
      {
        name: "bedroomCount",
        label: "Bedrooms",
        displayType: "stepper",
        options: [
          { label: "Studio", priceModifier: 0 },
          { label: "1 Bedroom", priceModifier: 0 },
          { label: "2 Bedrooms", priceModifier: 30 },
          { label: "3 Bedrooms", priceModifier: 55 },
          { label: "4 Bedrooms", priceModifier: 85 },
          { label: "5 Bedrooms", priceModifier: 110 },
          { label: "6+ Bedrooms", priceModifier: 140 },
        ],
      },
      {
        name: "bathroomCount",
        label: "Bathrooms",
        displayType: "stepper",
        options: [
          { label: "1 Bathroom", priceModifier: 0 },
          { label: "2 Bathrooms", priceModifier: 25 },
          { label: "3 Bathrooms", priceModifier: 40 },
          { label: "4 Bathrooms", priceModifier: 60 },
          { label: "5 Bathrooms", priceModifier: 80 },
          { label: "6+ Bathrooms", priceModifier: 100 },
        ],
      },
      {
        name: "cleanType",
        label: "Type of Cleaning Session",
        options: [
          { label: "Standard Maintenance Clean", priceModifier: 0 },
          { label: "Deep Structural Clean (+$45)", priceModifier: 45 },
          { label: "Move-In / Move-Out Clean (+$75)", priceModifier: 75 },
        ],
      },
      {
        name: "petFactor",
        label: "Pets in Home",
        options: [
          { label: "No Pets", priceModifier: 0 },
          { label: "Yes, pet hair specialty sweep (+$25)", priceModifier: 25 },
        ],
      },
      {
        name: "extrasAppliances",
        label: "Appliance Interior Cleaning",
        options: [
          { label: "Skip appliance interiors", priceModifier: 0 },
          { label: "Inside fridge + inside oven (+$40)", priceModifier: 40 },
        ],
      },
      {
        name: "extrasLinens",
        label: "Laundry & Linen Add-ons",
        options: [
          { label: "No laundry or linen service", priceModifier: 0 },
          { label: "Laundry folding + bed making (+$30)", priceModifier: 30 },
        ],
      },
      {
        name: "extrasWindows",
        label: "Interior Window Cleaning",
        options: [
          { label: "Skip interior windows", priceModifier: 0 },
          { label: "Clean all interior windows (+$20)", priceModifier: 20 },
        ],
      },
      {
        name: "clutterLevel",
        label: "Home Clutter Level",
        options: [
          { label: "Tidy — easy access to all surfaces", priceModifier: 0 },
          { label: "Moderate clutter — some clearing needed (+$15)", priceModifier: 15 },
          { label: "Heavy clutter — significant pre-clean prep (+$30)", priceModifier: 30 },
        ],
      },
    ],
  },
  {
    id: "tv-installation",
    name: "TV Installation",
    iconName: "Tv",
    tagline: "Secure, perfectly level TV wall mounting and clean cable management.",
    description: "Get your TV securely mounted on any surface with professional stud finding, precision leveling, and wire concealment. Safe for toddlers, pets, and perfectly suited for your optimal viewing angle.",
    basePrice: 95,
    unitName: "TV unit",
    unitLabel: "Total TVs to Install",
    pricePerUnit: 40,
    minUnits: 1,
    maxUnits: 4,
    stepUnits: 1,
    estimatedMinutesPerUnit: 60,
    popularUnitValue: 1,
    includedSpecs: [
      "Find studs and test dry-integrity with digital detectors",
      "Mount heavy-duty steel brackets with high-strength lag bolts",
      "Precision calibration with bubble levels",
      "Hook up system components (Consoles, Soundbars, Media Units)",
      "Zip-tie and organize power and HDMI utility lines",
      "Verify HDMI connection signals and power up systems",
    ],
    factors: [
      {
        name: "tvSize",
        label: "TV Screen Size",
        options: [
          { label: "Up to 43 inches", priceModifier: 0 },
          { label: "44 to 65 inches", priceModifier: 0 },
          { label: "66 to 85 inches (+$25)", priceModifier: 25 },
          { label: "86 inches or larger (+$45)", priceModifier: 45 },
        ],
      },
      {
        name: "mountType",
        label: "Mount Bracket",
        options: [
          { label: "I have my own bracket / Flat Fixed Bracket", priceModifier: 0 },
          { label: "Tilting Wall Bracket provided by tech (+$20)", priceModifier: 20 },
          { label: "Full-Motion Swivel Bracket provided by tech (+$48)", priceModifier: 48 },
        ],
      },
      {
        name: "wallMaterial",
        label: "Wall Surface Material",
        options: [
          { label: "Standard Drywall / Wood Studs", priceModifier: 0 },
          { label: "Concrete, Brick or Masonry (+$30)", priceModifier: 30 },
          { label: "Metal Studs Stud-Lock system (+$25)", priceModifier: 25 },
        ],
      },
      {
        name: "wireHiding",
        label: "Wire & Cable Management",
        options: [
          { label: "Tidy bundle with velcro wraps", priceModifier: 0 },
          { label: "In-wall routing with discrete outlet plates (+$45)", priceModifier: 45 },
        ],
      },
      {
        name: "soundbarSetup",
        label: "Soundbar / Component Setup",
        options: [
          { label: "TV only — no additional components", priceModifier: 0 },
          { label: "Connect soundbar, console or media device (+$20)", priceModifier: 20 },
        ],
      },
    ],
  },
  {
    id: "lawn-mowing",
    name: "Lawn Mowing",
    iconName: "Scissors",
    tagline: "Precision lawn trimming, detailing, and green disposal.",
    description: "Keep your curb appeal immaculate. Our service includes sharp-blade mowing, line trimming along fences, obstacles and trees, concrete sidewalk edging, and clean power-blower finish.",
    basePrice: 45,
    unitName: "1k sq ft",
    unitLabel: "Lawn Area (approx. sq ft - in 1,000s)",
    pricePerUnit: 15,
    minUnits: 1,
    maxUnits: 12,
    stepUnits: 1,
    estimatedMinutesPerUnit: 20,
    popularUnitValue: 2,
    includedSpecs: [
      "Lawn mowing with professional walk-behind or ride-on mowers",
      "Trimming of all grass along garden beds, posts, and trees",
      "Sidewalk, driveway, and patio edge blade-grooming",
      "Sidewalk and patio high-velocity blow-clean of clippings",
      "Bagging and recycling of green waste (eco-composted)",
    ],
    factors: [
      {
        name: "grassHeight",
        label: "Current Yard Overgrowth",
        options: [
          { label: "Regular maintained length (under 3 inches)", priceModifier: 0 },
          { label: "Overgrown yard (3 to 8 inches) (+$25)", priceModifier: 25 },
          { label: "Wild brush / Clearing required (8+ inches) (+$65)", priceModifier: 65 },
        ],
      },
      {
        name: "baggingClippings",
        label: "Clippings Handling",
        options: [
          { label: "Mulch back into lawn (natural fertilizing)", priceModifier: 0 },
          { label: "Collect and bag for green bin disposal (+$10)", priceModifier: 10 },
        ],
      },
      {
        name: "edgingService",
        label: "Edging & Shrub Trimming",
        options: [
          { label: "Mowing only — no extra edging", priceModifier: 0 },
          { label: "Hard edge walkways + trim shrubs & hedges (+$20)", priceModifier: 20 },
        ],
      },
      {
        name: "debrisCleanup",
        label: "Yard Debris & Leaf Cleanup",
        options: [
          { label: "No debris removal needed", priceModifier: 0 },
          { label: "Rake & remove leaves and yard debris (+$35)", priceModifier: 35 },
        ],
      },
      {
        name: "weedControl",
        label: "Weed Removal",
        options: [
          { label: "No weed removal", priceModifier: 0 },
          { label: "Hand-pull weeds from beds & cracks (+$25)", priceModifier: 25 },
        ],
      },
    ],
  },
  {
    id: "furniture-assembly",
    name: "Furniture Assembly",
    iconName: "Hammer",
    tagline: "Stress-free, sturdy setup of flat-pack furniture of any brand.",
    description: "Don't sweat the instruction booklets. We assemble chairs, beds, dressers, study desks, patio furniture, and IKEA flat-packs quickly and securely with robust anchor safety measures.",
    basePrice: 60,
    unitName: "assembly unit",
    unitLabel: "Total Items to Assemble",
    pricePerUnit: 25,
    minUnits: 1,
    maxUnits: 10,
    stepUnits: 1,
    estimatedMinutesPerUnit: 45,
    popularUnitValue: 1,
    includedSpecs: [
      "Hardware and panel sorting with manual parts verification",
      "Tension-checked joint alignment with manual screw torque checks",
      "Product leveling and leg cushion adjustments",
      "Anti-tip and load-bearing safety checks",
      "Flat cardboard shipping box compression and stacking",
    ],
    factors: [
      {
        name: "furnitureComplexity",
        label: "Item Size & Complexity",
        options: [
          { label: "Simple (Chair, Nightstand, Coffee table)", priceModifier: 0 },
          { label: "Medium (Bed frame, Writing desk, TV console) (+$25)", priceModifier: 25 },
          { label: "Highly Complex (Wardrobe, Multi-drawer dresser, L-Desk) (+$50)", priceModifier: 50 },
        ],
      },
      {
        name: "furnitureBrand",
        label: "Furniture Brand / Source",
        options: [
          { label: "IKEA flat-pack (instructions provided)", priceModifier: 0 },
          { label: "Other flat-pack brand (Amazon, Wayfair, Target...)", priceModifier: 0 },
          { label: "Custom / no instructions — may take longer (+$20)", priceModifier: 20 },
        ],
      },
      {
        name: "wallAnchor",
        label: "Anti-Tip Wall Anchoring",
        options: [
          { label: "No wall anchoring needed", priceModifier: 0 },
          { label: "Anchor heavy items into studs for family safety (+$15)", priceModifier: 15 },
        ],
      },
      {
        name: "boxHaulAway",
        label: "Packaging Haul-Away",
        options: [
          { label: "I'll handle the boxes myself", priceModifier: 0 },
          { label: "Tech compresses + takes all packaging to dumpster (+$15)", priceModifier: 15 },
        ],
      },
    ],
  },
  {
    id: "pressure-washing",
    name: "Pressure Washing",
    iconName: "ShowerHead",
    tagline: "Deep pressure cleaning of driveways, decks, brickwork, and home siding.",
    description: "Power wash away years of baked-on dirt, grime, moss, and green mildew. Essential for restoring patios, decks, concrete pathways, and house exterior walls back to sparkling pristine condition.",
    basePrice: 95,
    unitName: "500 sq ft",
    unitLabel: "Area Size (approx. sq ft - in 500s)",
    pricePerUnit: 30,
    minUnits: 1,
    maxUnits: 10,
    stepUnits: 1,
    estimatedMinutesPerUnit: 30,
    popularUnitValue: 2,
    includedSpecs: [
      "Wander inspect for masonry moss or fragile paint lines",
      "Pre-soak with biological surfactant detergents to loosen grime",
      "Uniform wash of floor flatwork with rotating surface cleaners",
      "High-pressure wand detailing of concrete joint lines and corners",
      "Rinse-down of adjacent siding, plants, and driveway run-offs",
    ],
    factors: [
      {
        name: "surfaceMaterial",
        label: "Surface Type",
        options: [
          { label: "Smooth Concrete or Mortar Patio", priceModifier: 0 },
          { label: "Delicate Timber Decking / Wooden Siding (+$25)", priceModifier: 25 },
          { label: "Heavy Texture Stone, Brickwork, or Roof Tiling (+$40)", priceModifier: 40 },
        ],
      },
      {
        name: "dirtLevel",
        label: "Surface Condition / Stain Level",
        options: [
          { label: "Light — seasonal dust and light mildew", priceModifier: 0 },
          { label: "Moderate — embedded grime, green algae (+$20)", priceModifier: 20 },
          { label: "Heavy — deep stains, black mold, years of buildup (+$45)", priceModifier: 45 },
        ],
      },
      {
        name: "oilTreatment",
        label: "Oil, Rust & Stain Pre-Treatment",
        options: [
          { label: "Standard dirt & mildew clean — no pre-treatment", priceModifier: 0 },
          { label: "Degreaser for machinery oil/rust spots (+$35)", priceModifier: 35 },
        ],
      },
      {
        name: "sealingCoating",
        label: "Protective Sealing After Wash",
        options: [
          { label: "Wash only — no sealing", priceModifier: 0 },
          { label: "Apply concrete or wood protective sealant (+$75)", priceModifier: 75 },
        ],
      },
      {
        name: "gutteraddon",
        label: "Gutter Cleaning Add-On",
        options: [
          { label: "No gutter cleaning", priceModifier: 0 },
          { label: "Clear gutters and downspouts while on-site (+$45)", priceModifier: 45 },
        ],
      },
    ],
  },
  {
    id: "wall-mounting",
    name: "Wall Mounting",
    iconName: "Drill",
    tagline: "Expert shelving, artwork, mirrors, and cabinet mounting on any wall surface.",
    description: "From floating shelves and bathroom cabinets to large mirrors and gallery walls, we mount any item securely with stud detection, precision leveling, and load-bearing hardware rated for your item's weight.",
    basePrice: 55,
    unitName: "item",
    unitLabel: "Total Items to Mount",
    pricePerUnit: 20,
    minUnits: 1,
    maxUnits: 8,
    stepUnits: 1,
    estimatedMinutesPerUnit: 30,
    popularUnitValue: 2,
    includedSpecs: [
      "Electronic stud and wire detection before every drill",
      "Grade-rated anchors and hardware selected for item weight",
      "Precision digital leveling to within 1mm",
      "Pilot hole drilling with dust-controlled bit guard",
      "Load test after mounting — tested at 2× stated capacity",
      "Clean-up and patch of any prior anchor holes (if requested)",
    ],
    factors: [
      {
        name: "mountItemType",
        label: "What Are You Mounting?",
        options: [
          { label: "Floating shelf or small décor", priceModifier: 0 },
          { label: "Large mirror or framed artwork", priceModifier: 0 },
          { label: "Cabinet, towel bar or bathroom fixture", priceModifier: 0 },
          { label: "Gallery wall (5+ items — coordinated layout) (+$25)", priceModifier: 25 },
        ],
      },
      {
        name: "wallSurface",
        label: "Wall Surface Material",
        options: [
          { label: "Standard Drywall / Wood Studs", priceModifier: 0 },
          { label: "Tile or Glass Surface (+$20)", priceModifier: 20 },
          { label: "Concrete, Brick or Masonry (+$30)", priceModifier: 30 },
        ],
      },
      {
        name: "itemWeight",
        label: "Item Weight Class",
        options: [
          { label: "Light (under 25 lbs) — décor, small shelves", priceModifier: 0 },
          { label: "Medium (25–60 lbs) — large mirrors, shelving units (+$15)", priceModifier: 15 },
          { label: "Heavy (60+ lbs) — cabinets, large artwork, safes (+$30)", priceModifier: 30 },
        ],
      },
      {
        name: "holePatchRepair",
        label: "Prior Hole Patching",
        options: [
          { label: "No patching needed — fresh wall", priceModifier: 0 },
          { label: "Patch & sand old anchor holes before mounting (+$20)", priceModifier: 20 },
        ],
      },
    ],
  },
  {
    id: "vacation-rental-turnover",
    name: "Vacation Rental Turnover",
    iconName: "KeyRound",
    tagline: "Guest-ready turnovers between stays — reliable, documented, on schedule.",
    description: "Professional Airbnb/VRBO turnover cleaning timed to your check-in/check-out. Every turnover includes before/after photo documentation, guest-ready staging, full sanitizing, trash removal, and a supplies check — so the property is always ready for the next guest.",
    basePrice: 89,
    unitName: "turnover",
    unitLabel: "Turnover",
    pricePerUnit: 0,
    minUnits: 1,
    maxUnits: 1,
    stepUnits: 1,
    estimatedMinutesPerUnit: 120,
    popularUnitValue: 1,
    includedSpecs: [
      "Before & after photo documentation for your records",
      "Guest-ready staging — beds made, towels set, surfaces reset",
      "Full sanitizing of kitchen and bathrooms",
      "Vacuum, sweep, and mop all floors",
      "Trash & recycling removal, fresh liners",
      "Supplies check (soap, paper, essentials) so you're never caught short",
    ],
    factors: [
      {
        name: "bedrooms",
        label: "Bedrooms",
        displayType: "stepper",
        options: [
          { label: "Studio", priceModifier: 0 },
          { label: "1 Bedroom", priceModifier: 0 },
          { label: "2 Bedrooms", priceModifier: 30 },
          { label: "3 Bedrooms", priceModifier: 55 },
          { label: "4 Bedrooms", priceModifier: 85 },
          { label: "5+ Bedrooms", priceModifier: 115 },
        ],
      },
      {
        name: "bathrooms",
        label: "Bathrooms",
        displayType: "stepper",
        options: [
          { label: "1 Bathroom", priceModifier: 0 },
          { label: "2 Bathrooms", priceModifier: 20 },
          { label: "3 Bathrooms", priceModifier: 35 },
          { label: "4+ Bathrooms", priceModifier: 50 },
        ],
      },
      {
        name: "restock",
        label: "Amenity Restocking",
        options: [
          { label: "No restocking", priceModifier: 0 },
          { label: "Restock guest amenities — soap, paper, coffee (+$20)", priceModifier: 20 },
        ],
      },
      {
        name: "laundry",
        label: "Linen & Laundry",
        options: [
          { label: "No laundry", priceModifier: 0 },
          { label: "Wash & fold linens and towels on-site (+$30)", priceModifier: 30 },
        ],
      },
      {
        name: "expressTurnover",
        label: "Turnaround Speed",
        options: [
          { label: "Standard scheduling", priceModifier: 0 },
          { label: "Express turnover — under 4 hours notice (+$45)", priceModifier: 45 },
        ],
      },
    ],
  },
];

// ── Init Firebase Admin ────────────────────────────────────────────────────
const credential = serviceAccountPath
  ? cert(JSON.parse(await readFile(serviceAccountPath, "utf8")))
  : applicationDefault();

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential, projectId });

const db = getFirestore(app, databaseId);

// ── Write to Firestore ─────────────────────────────────────────────────────
console.log(`\n🔧  ${dryRun ? "[DRY RUN] " : ""}Seeding ${SERVICES_DATA.length} services → Firestore (${databaseId})\n`);

for (const service of SERVICES_DATA) {
  const factorSummary = service.factors.map((f) => `${f.name}(${f.options.length})`).join(", ");
  console.log(`  ✏️  ${service.id}  [${service.factors.length} factors: ${factorSummary}]`);

  if (!dryRun) {
    await db.collection("services").doc(service.id).set(service);
  }
}

console.log(`\n${dryRun ? "✅  Dry run complete — nothing written." : "✅  All services synced to Firestore."}\n`);
