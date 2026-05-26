import { Service, Booking, Review } from "./types";

export const SERVICES_DATA: Service[] = [
  {
    id: "house-cleaning",
    name: "House Cleaning",
    iconName: "Sparkles",
    tagline: "Spotless professional cleaning for a pristine, healthy home.",
    description: "Our certified professionals use eco-friendly cleaners to deep clean your house. Every clean includes vacuuming, dusting, mopping, trash disposal, and sanitizing kitchens and bathrooms.",
    basePrice: 85,
    unitName: "room",
    unitLabel: "Additional Rooms (beyond standard living & kitchen)",
    pricePerUnit: 25,
    minUnits: 0,
    maxUnits: 8,
    stepUnits: 1,
    estimatedMinutesPerUnit: 40,
    popularUnitValue: 3,
    includedSpecs: [
      "Dust and wipe all accessible surfaces",
      "Vacuum all carpets, rugs, and stairs",
      "Sweep and sanitize all hard-floor areas",
      "Load dishwasher or wash up to 10 sink dishes",
      "Scrub, disinfect and polish toilets, sinks, and showers",
      "Take out trash and replace liner bags"
    ],
    factors: [
      {
        name: "cleanType",
        label: "Type of Cleaning Session",
        options: [
          { label: "Standard Maintenance Clean", priceModifier: 0 },
          { label: "Deep Structural Clean (+ $45)", priceModifier: 45 },
          { label: "Move-In / Move-Out Clean (+ $75)", priceModifier: 75 }
        ]
      },
      {
        name: "petFactor",
        label: "Pets in Home",
        options: [
          { label: "No Pets", priceModifier: 0 },
          { label: "Yes, with pet hair specialty sweep (+ $25)", priceModifier: 25 }
        ]
      }
    ]
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
      "Verify HDMI connection signals and power up systems"
    ],
    factors: [
      {
        name: "mountType",
        label: "Provided Mount Bracket",
        options: [
          { label: "I have my own bracket / Flat Fixed Bracket", priceModifier: 0 },
          { label: "Tilting Wall Bracket provided by tech (+ $20)", priceModifier: 20 },
          { label: "Premium Full-Motion Swivel Bracket provided by tech (+ $48)", priceModifier: 48 }
        ]
      },
      {
        name: "wallMaterial",
        label: "Wall Surface Material",
        options: [
          { label: "Standard Drywall / Wood Studs", priceModifier: 0 },
          { label: "Concrete, Brick or Masonry (+ $30)", priceModifier: 30 },
          { label: "Metal Studs Stud-Lock system (+ $25)", priceModifier: 25 }
        ]
      },
      {
        name: "wireHiding",
        label: "Wire Management",
        options: [
          { label: "Tidy bundle with velcro wraps", priceModifier: 0 },
          { label: "In-wall wire routing with discrete plates (+ $45)", priceModifier: 45 }
        ]
      }
    ]
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
      "sidewalk, driveway, and patio edge blade-grooming",
      "Sidewalk and patio high-velocity blow-clean of clippings",
      "Bagging and recycling of green waste (eco-composted)"
    ],
    factors: [
      {
        name: "grassHeight",
        label: "Current Yard Overgrowth",
        options: [
          { label: "Regular maintained length (under 3 inches)", priceModifier: 0 },
          { label: "Overgrown yard (3 to 8 inches) (+ $25)", priceModifier: 25 },
          { label: "Wild brush / Clearing required (8+ inches) (+ $65)", priceModifier: 65 }
        ]
      },
      {
        name: "baggingClippings",
        label: "Clippings Handling",
        options: [
          { label: "Mulch lawn (natural lawn fertilizing)", priceModifier: 0 },
          { label: "Collect and bag in green bins (+ $10)", priceModifier: 10 }
        ]
      }
    ]
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
      "Flat cardboard shipping box compression and stacking"
    ],
    factors: [
      {
        name: "furnitureComplexity",
        label: "Item Size & Complexity",
        options: [
          { label: "Simple (Chair, Nightstand, Coffee table)", priceModifier: 0 },
          { label: "Medium (Bed frame, Writing desk, TV console) (+ $25)", priceModifier: 25 },
          { label: "Highly Complex (Wardrobe, Multi-drawer dresser, L-Desk) (+ $50)", priceModifier: 50 }
        ]
      },
      {
        name: "wallAnchor",
        label: "Anti-Tip Wall Anchoring",
        options: [
          { label: "No wall anchoring needed", priceModifier: 0 },
          { label: "Anchor heavy items into studs for family safety (+ $15)", priceModifier: 15 }
        ]
      }
    ]
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
      "Rinse-down of adjacent siding, plants, and driveway run-offs"
    ],
    factors: [
      {
        name: "surfaceMaterial",
        label: "Surface Type",
        options: [
          { label: "Smooth Concrete or Mortar Patio", priceModifier: 0 },
          { label: "Delicate Timber Decking / Wooden Siding (+ $25)", priceModifier: 25 },
          { label: "Heavy Texture Stone, Brickwork, or Roof Tiling (+ $40)", priceModifier: 40 }
        ]
      },
      {
        name: "oilTreatment",
        label: "Special Oil & Rust Stain Prep",
        options: [
          { label: "Standard atmospheric dirt & mildew clean", priceModifier: 0 },
          { label: "Degreaser treatment for persistent machinery oil/rust (+ $35)", priceModifier: 35 }
        ]
      }
    ]
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: "r1",
    serviceId: "house-cleaning",
    authorName: "Sarah M.",
    rating: 5,
    comment: "Absolutely outstanding work! The two cleaning techs arrived exactly on time. They left my kitchen counter surfaces looking glossier than they were when we first moved in. Highly recommend the deep clean factor!",
    date: "2026-05-18",
    helpfulCount: 14,
    verified: true
  },
  {
    id: "r2",
    serviceId: "tv-installation",
    authorName: "Marcus G.",
    rating: 5,
    comment: "Very professional install. Securely mounted my heavy 85-inch OLED. Cable management is elite - completely routed inside the wall with dual terminal safety sockets. Worth every cent.",
    date: "2026-05-20",
    helpfulCount: 8,
    verified: true
  },
  {
    id: "r3",
    serviceId: "lawn-mowing",
    authorName: "Brenda K.",
    rating: 4,
    comment: "The yard trimming and mow was great. Our lawn was heavily overgrown after a rainy week. They did a fantastic job bagging up all the excess wet debris. Deducting a star because they arrived 15 mins late, but they made up for it with excellent concrete siding edging.",
    date: "2026-05-22",
    helpfulCount: 3,
    verified: true
  },
  {
    id: "r4",
    serviceId: "furniture-assembly",
    authorName: "David L.",
    rating: 5,
    comment: "I had a massive 6-drawer chest of drawers that looked like a nightmare to assemble. The technician flew through the process in 45 minutes on his own. Perfect alignment, zero wobble, and he carried the flat pack box straight out to my recycle dumpster.",
    date: "2026-05-15",
    helpfulCount: 9,
    verified: true
  },
  {
    id: "r5",
    serviceId: "pressure-washing",
    authorName: "Eleanor P.",
    rating: 5,
    comment: "Our concrete driveway and front porch had deep black moss stains from being parked under shade trees. The surface cleaner did wonders. It looks like brand new white concrete again!",
    date: "2026-05-19",
    helpfulCount: 11,
    verified: true
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "BK-4912",
    serviceId: "house-cleaning",
    serviceName: "House Cleaning",
    bookingDate: "2026-05-26",
    timeSlot: "09:00 AM - 12:00 PM",
    status: "scheduled",
    customerName: "Alex Mercer",
    email: "alex.mercer@gmail.com",
    phone: "(555) 321-4122",
    address: "742 Evergreen Terrace, Springfield",
    units: 3,
    selectedFactors: {
      "cleanType": { label: "Deep Structural Clean", modifier: 45 },
      "petFactor": { label: "Yes, with pet hair specialty sweep", modifier: 25 }
    },
    frequency: "monthly",
    notes: "Code for the security gate is #2203. Mind the golden retriever, he's very friendly!",
    totalCost: 207, // 85 + (3 * 25) + 45 + 25 = 230 - 10% (monthly discount) = 207
    createdAt: "2026-05-24T14:12:00Z"
  },
  {
    id: "BK-3129",
    serviceId: "tv-installation",
    serviceName: "TV Installation",
    bookingDate: "2026-05-25",
    timeSlot: "01:00 PM - 03:00 PM",
    status: "dispatched",
    customerName: "Diana Prince",
    email: "diana.p@themyscira.com",
    phone: "(555) 492-3112",
    address: "100 Gateway Boulevard, Apt 4C",
    units: 1,
    selectedFactors: {
      "mountType": { label: "Premium Full-Motion Swivel Bracket provided by tech", modifier: 48 },
      "wallMaterial": { label: "Standard Drywall / Wood Studs", modifier: 0 },
      "wireHiding": { label: "In-wall wire routing with discrete plates", modifier: 45 }
    },
    frequency: "once",
    notes: "Please call upon arrival. Parking available in space 4C.",
    totalCost: 228, // 95 + (1 * 40) + 48 + 0 + 45 = 228
    createdAt: "2026-05-24T09:30:00Z"
  }
];
