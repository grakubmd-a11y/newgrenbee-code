/**
 * Launch city content — source of truth for the SEO landing pages.
 *
 * This module is server-importable (no client deps) so generateStaticParams /
 * generateMetadata never depend on build-time Firestore credentials. The seed
 * script (scripts/seed-area-content.mjs) writes these docs to the `areaContent`
 * collection, where the Admin panel can later edit them; the server fetchers
 * (lib/areaContent.server.ts) prefer the Firestore copy and fall back here.
 *
 * Content is intentionally localized (Utah hard water, mountain climate, real
 * neighborhoods) — generic templated copy does not rank for local searches.
 */
import type { AreaContent } from "@grenbee/types";

export const LAUNCH_AREAS: AreaContent[] = [
  // ── Mapleton ────────────────────────────────────────────────────────────
  {
    id: "mapleton",
    slug: "mapleton",
    city: "Mapleton",
    state: "UT",
    active: true,
    heroHeadline: "House Cleaning & Lawn Care in Mapleton, UT",
    heroSubtitle:
      "Trusted, insured home services for Mapleton's foothill neighborhoods — from Maple Mountain estates to the orchards along 1600 East. Transparent pricing, no surprises.",
    introParagraph:
      "Mapleton homes sit on larger lots against the Wasatch foothills, which means more lawn to maintain and hard, mineral-heavy water that leaves spots on everything. Grenbee pairs you with vetted local pros for recurring house cleaning and lawn mowing, so your weekends stay yours.",
    serviceBlocks: [
      {
        serviceId: "house-cleaning",
        serviceName: "House Cleaning",
        localDescription:
          "Mapleton's hard water leaves stubborn mineral buildup on glass, fixtures, and showers. Our cleaners use the right products to cut through Utah hard-water spotting and keep your larger foothill home spotless, visit after visit.",
      },
      {
        serviceId: "lawn-mowing",
        serviceName: "Lawn Mowing",
        localDescription:
          "From the big lots near Maple Mountain to tidy yards off Main Street, we keep Mapleton lawns sharp with regular mowing, crisp edging, and full blow-off. Weekly and bi-weekly schedules through the Utah growing season.",
      },
    ],
    neighborhoods: [
      "Maple Mountain",
      "Hobble Creek",
      "Mapleton East Bench",
      "Whiting",
      "Mapleton City Center",
      "Spring Lake",
    ],
    testimonials: [
      {
        name: "Rachel M.",
        location: "Maple Mountain, Mapleton",
        text: "Our well water destroyed every shower we cleaned ourselves. Grenbee actually keeps the glass clear. Worth every penny.",
        rating: 5,
      },
      {
        name: "Devin K.",
        location: "Mapleton East Bench",
        text: "Big yard, and they nail the edging every single week. Always on time, always friendly.",
        rating: 5,
      },
      {
        name: "Steph A.",
        location: "Hobble Creek",
        text: "Booked a recurring clean and it's been flawless. The crew is thorough and trustworthy.",
        rating: 5,
      },
    ],
    faqs: [
      {
        question: "Do you serve all of Mapleton?",
        answer:
          "Yes — we cover all of Mapleton including the East Bench, Maple Mountain, and Hobble Creek areas. Enter your ZIP at checkout to confirm coverage.",
      },
      {
        question: "Can you handle Mapleton's hard water buildup?",
        answer:
          "Absolutely. Mapleton's mineral-heavy water is exactly why many homeowners hire us. We use hard-water-specific products on glass, fixtures, and showers.",
      },
      {
        question: "Do you mow larger foothill lots?",
        answer:
          "Yes. Many Mapleton properties sit on bigger lots — pricing scales with yard size, and you'll see the exact quote before you book.",
      },
      {
        question: "Are your technicians insured?",
        answer:
          "Every Grenbee pro is background-checked, trained, and fully insured. Zero risk to you.",
      },
    ],
    seoTitle: "House Cleaning & Lawn Care in Mapleton, UT | Grenbee",
    seoDescription:
      "Professional house cleaning and lawn mowing in Mapleton, UT. Hard-water cleaning experts, vetted insured pros, transparent pricing. Book online in minutes.",
    updatedAt: "",
  },

  // ── Spanish Fork ────────────────────────────────────────────────────────
  {
    id: "spanish-fork",
    slug: "spanish-fork",
    city: "Spanish Fork",
    state: "UT",
    active: true,
    heroHeadline: "House Cleaning & Lawn Care in Spanish Fork, UT",
    heroSubtitle:
      "Reliable home services for Spanish Fork families — from the new builds in Spanish Oaks to established homes near Main Street. Book online, skip the phone tag.",
    introParagraph:
      "Spanish Fork is one of Utah County's fastest-growing cities, full of busy dual-income families and brand-new homes that deserve to stay that way. Grenbee handles your recurring house cleaning and lawn mowing with vetted local pros and pricing you can see up front.",
    serviceBlocks: [
      {
        serviceId: "house-cleaning",
        serviceName: "House Cleaning",
        localDescription:
          "Whether it's a new build in Spanish Oaks or a family home near the river bottoms, we keep Spanish Fork homes spotless — kitchens, baths, floors, and the hard-water spots Utah is famous for.",
      },
      {
        serviceId: "lawn-mowing",
        serviceName: "Lawn Mowing",
        localDescription:
          "New-construction lawns need consistent care to fill in right. We mow, edge, and blow off Spanish Fork yards on a weekly or bi-weekly schedule all season long.",
      },
    ],
    neighborhoods: [
      "Spanish Oaks",
      "Canyon Hills",
      "Palmyra",
      "River Bottoms",
      "Spanish Fork City Center",
      "Powerhouse",
    ],
    testimonials: [
      {
        name: "Brooke H.",
        location: "Spanish Oaks, Spanish Fork",
        text: "New house, no time. Grenbee keeps it immaculate and booking online took two minutes.",
        rating: 5,
      },
      {
        name: "Marco D.",
        location: "Palmyra, Spanish Fork",
        text: "The lawn looks better than it ever has. Crew is dependable and the price is fair.",
        rating: 5,
      },
      {
        name: "Tessa R.",
        location: "Canyon Hills",
        text: "Switched from another company and the difference is night and day. Highly recommend.",
        rating: 5,
      },
    ],
    faqs: [
      {
        question: "Do you serve all of Spanish Fork?",
        answer:
          "Yes — we cover all Spanish Fork neighborhoods including Spanish Oaks, Palmyra, and Canyon Hills. Confirm your ZIP at checkout.",
      },
      {
        question: "Do you clean new-construction homes?",
        answer:
          "Definitely. We do recurring maintenance cleans and one-time deep cleans for new builds across Spanish Fork.",
      },
      {
        question: "Can I set up recurring lawn mowing?",
        answer:
          "Yes — choose weekly or bi-weekly and lock in your rate. Recurring plans get priority scheduling.",
      },
      {
        question: "How do I get a price?",
        answer:
          "Use our online estimator for an instant quote — no phone call required.",
      },
    ],
    seoTitle: "House Cleaning & Lawn Care in Spanish Fork, UT | Grenbee",
    seoDescription:
      "Professional house cleaning and lawn mowing in Spanish Fork, UT. Vetted insured pros, transparent online pricing, recurring plans. Book in minutes.",
    updatedAt: "",
  },

  // ── Heber City ──────────────────────────────────────────────────────────
  {
    id: "heber",
    slug: "heber",
    city: "Heber City",
    state: "UT",
    active: true,
    heroHeadline: "House Cleaning & Lawn Care in Heber City, UT",
    heroSubtitle:
      "Mountain-valley home services for Heber and the Wasatch Back — from Red Ledges estates to family homes off Main Street. Insured pros, clear pricing.",
    introParagraph:
      "Heber Valley's high-altitude climate means a shorter, intense growing season and homes that range from working farms to luxury estates. Grenbee delivers dependable house cleaning and lawn mowing tuned to the Wasatch Back, with vetted local pros and up-front pricing.",
    serviceBlocks: [
      {
        serviceId: "house-cleaning",
        serviceName: "House Cleaning",
        localDescription:
          "From Red Ledges homes to cabins near the Provo River, we keep Heber Valley properties spotless year-round — including the dust and grit that comes with mountain living and second homes.",
      },
      {
        serviceId: "lawn-mowing",
        serviceName: "Lawn Mowing",
        localDescription:
          "Heber's growing season is short and fast. We keep your valley lawn sharp with well-timed mowing, edging, and blow-off from spring green-up through first frost.",
      },
    ],
    neighborhoods: [
      "Red Ledges",
      "Old Town Heber",
      "Lake Creek",
      "Timberlakes",
      "Center Creek",
      "Valley Hills",
    ],
    testimonials: [
      {
        name: "Karina L.",
        location: "Red Ledges, Heber City",
        text: "We're only here part of the year, so reliable cleaning between visits is everything. Grenbee never misses.",
        rating: 5,
      },
      {
        name: "Tyler B.",
        location: "Old Town Heber",
        text: "Great mowing service all summer. They know the valley and show up like clockwork.",
        rating: 5,
      },
      {
        name: "Megan F.",
        location: "Lake Creek",
        text: "Professional, insured, and genuinely nice people. The house has never looked better.",
        rating: 5,
      },
    ],
    faqs: [
      {
        question: "Do you serve the whole Heber Valley?",
        answer:
          "Yes — we cover Heber City and the surrounding valley including Red Ledges, Lake Creek, and Center Creek. Confirm your ZIP at checkout.",
      },
      {
        question: "Can you service second homes and cabins?",
        answer:
          "Yes. Many Heber clients own part-time residences — we offer recurring cleaning and lawn care to keep them ready between visits.",
      },
      {
        question: "When does lawn season start in Heber?",
        answer:
          "At Heber's altitude, mowing typically runs from late spring through early fall. We schedule around the valley's growing season.",
      },
      {
        question: "Are your pros insured?",
        answer:
          "Every technician is background-checked, trained, and fully insured.",
      },
    ],
    seoTitle: "House Cleaning & Lawn Care in Heber City, UT | Grenbee",
    seoDescription:
      "Professional house cleaning and lawn mowing in Heber City & the Wasatch Back. Insured pros, second-home service, transparent pricing. Book online.",
    updatedAt: "",
  },

  // ── Midway ──────────────────────────────────────────────────────────────
  {
    id: "midway",
    slug: "midway",
    city: "Midway",
    state: "UT",
    active: true,
    heroHeadline: "House Cleaning & Lawn Care in Midway, UT",
    heroSubtitle:
      "Swiss-village home services for Midway — from Interlaken to the resort homes near Soldier Hollow. Vetted, insured, and right on schedule.",
    introParagraph:
      "Midway's charming, high-homeownership neighborhoods and resort properties demand a meticulous touch. Grenbee provides dependable recurring house cleaning and lawn mowing with vetted local pros and transparent, see-it-before-you-book pricing.",
    serviceBlocks: [
      {
        serviceId: "house-cleaning",
        serviceName: "House Cleaning",
        localDescription:
          "From Interlaken estates to homes near the Homestead, we keep Midway properties immaculate — detailed, consistent cleans that respect your home and your schedule.",
      },
      {
        serviceId: "lawn-mowing",
        serviceName: "Lawn Mowing",
        localDescription:
          "Midway's tidy lots and resort homes look their best with consistent care. We handle mowing, edging, and blow-off on a schedule that fits the mountain-valley season.",
      },
    ],
    neighborhoods: [
      "Interlaken",
      "Soldier Hollow",
      "The Homestead",
      "Swiss Village",
      "Midway Town Center",
      "Snake Creek",
    ],
    testimonials: [
      {
        name: "Anneke V.",
        location: "Interlaken, Midway",
        text: "Detail-oriented and completely reliable. They treat our home like their own.",
        rating: 5,
      },
      {
        name: "Cole P.",
        location: "Snake Creek, Midway",
        text: "Lawn looks resort-quality every week. Booking and billing are effortless.",
        rating: 5,
      },
      {
        name: "Hailey W.",
        location: "Swiss Village",
        text: "Best home service we've used in the valley. Punctual, thorough, and kind.",
        rating: 5,
      },
    ],
    faqs: [
      {
        question: "Do you serve all of Midway?",
        answer:
          "Yes — we cover all Midway neighborhoods including Interlaken, Snake Creek, and the Soldier Hollow area. Confirm your ZIP at checkout.",
      },
      {
        question: "Do you service resort and second homes?",
        answer:
          "Yes. We offer recurring cleaning and lawn care to keep part-time and resort homes guest-ready.",
      },
      {
        question: "Can I book recurring service?",
        answer:
          "Absolutely — weekly, bi-weekly, or monthly, with priority scheduling and a locked-in rate.",
      },
      {
        question: "Are your technicians insured?",
        answer:
          "Every Grenbee pro is background-checked, trained, and fully insured.",
      },
    ],
    seoTitle: "House Cleaning & Lawn Care in Midway, UT | Grenbee",
    seoDescription:
      "Professional house cleaning and lawn mowing in Midway, UT. Vetted insured pros, resort-home service, transparent pricing. Book online in minutes.",
    updatedAt: "",
  },

  // ── Park City ───────────────────────────────────────────────────────────
  {
    id: "park-city",
    slug: "park-city",
    city: "Park City",
    state: "UT",
    active: true,
    heroHeadline: "House Cleaning & Vacation Rental Turnovers in Park City, UT",
    heroSubtitle:
      "Home and short-term-rental cleaning for Park City — from Old Town condos to Deer Valley and Promontory estates. Reliable turnovers between guests, every time.",
    introParagraph:
      "Park City runs on hospitality: hundreds of homes here are vacation rentals that need spotless, on-time turnovers between guests — plus full-time residences that demand the same care. Grenbee specializes in dependable Park City cleaning, including short-term-rental turnovers timed to your check-in schedule.",
    serviceBlocks: [
      {
        serviceId: "house-cleaning",
        serviceName: "House Cleaning & Rental Turnovers",
        localDescription:
          "From Old Town condos to Deer Valley homes, we deliver consistent cleans and Airbnb/VRBO turnovers between guests — on time, every time, with the reliability your booking calendar demands.",
      },
      {
        serviceId: "lawn-mowing",
        serviceName: "Lawn Mowing",
        localDescription:
          "Park City's short alpine season makes timing everything. We keep yards and rental-property grounds sharp with well-scheduled mowing, edging, and blow-off through the summer.",
      },
    ],
    neighborhoods: [
      "Old Town",
      "Deer Valley",
      "Promontory",
      "Park Meadows",
      "Kimball Junction",
      "Canyons Village",
    ],
    testimonials: [
      {
        name: "Jordan S.",
        location: "Old Town, Park City",
        text: "We run three short-term rentals and Grenbee nails every turnover. Never a missed check-in.",
        rating: 5,
      },
      {
        name: "Priya N.",
        location: "Park Meadows, Park City",
        text: "Spotless cleans and they work around our guest calendar perfectly. Lifesavers.",
        rating: 5,
      },
      {
        name: "Garrett M.",
        location: "Promontory",
        text: "Reliable, insured, and detail-obsessed. Exactly what you need at this altitude and price point.",
        rating: 5,
      },
    ],
    faqs: [
      {
        question: "Do you do Airbnb / VRBO turnovers in Park City?",
        answer:
          "Yes — short-term-rental turnovers are a specialty. We clean between guests on your check-in/check-out schedule so the property is always guest-ready.",
      },
      {
        question: "Do you serve all of Park City?",
        answer:
          "Yes — Old Town, Deer Valley, Promontory, Park Meadows, Kimball Junction, and Canyons Village. Confirm your ZIP at checkout.",
      },
      {
        question: "Can you handle tight same-day turnaround?",
        answer:
          "We schedule turnovers around your bookings and offer faster turnaround options for back-to-back reservations.",
      },
      {
        question: "Are your cleaners insured?",
        answer:
          "Every Grenbee pro is background-checked, trained, and fully insured — essential peace of mind for rental owners.",
      },
    ],
    seoTitle: "Park City House Cleaning & Vacation Rental Turnovers | Grenbee",
    seoDescription:
      "Park City house cleaning and Airbnb/VRBO turnover service. Reliable guest-ready turnovers, insured pros, Old Town to Deer Valley. Book online.",
    updatedAt: "",
  },

  // ── Draper ──────────────────────────────────────────────────────────────
  {
    id: "draper",
    slug: "draper",
    city: "Draper",
    state: "UT",
    active: true,
    heroHeadline: "House Cleaning & Lawn Care in Draper, UT",
    heroSubtitle:
      "Premium home services for Draper's Silicon Slopes professionals — from SunCrest's mountain homes to Corner Canyon estates. Reliable, insured, and built around your busy schedule.",
    introParagraph:
      "Draper is home to Utah's tech corridor: high-earning professionals with demanding jobs and large homes who'd rather spend their free time on the trails than on chores. Grenbee delivers consistent, premium house cleaning and lawn mowing with vetted local pros and pricing you see before you book.",
    serviceBlocks: [
      {
        serviceId: "house-cleaning",
        serviceName: "House Cleaning",
        localDescription:
          "From SunCrest's hillside homes to Corner Canyon estates, we keep Draper's larger properties immaculate — detailed, consistent cleans that fit around demanding tech-industry schedules.",
      },
      {
        serviceId: "lawn-mowing",
        serviceName: "Lawn Mowing",
        localDescription:
          "Draper's elevation and sloped lots demand careful mowing. We handle weekly and bi-weekly mowing, edging, and blow-off so your yard always looks sharp — without you lifting a finger.",
      },
    ],
    neighborhoods: [
      "SunCrest",
      "Corner Canyon",
      "Steep Mountain",
      "South Mountain",
      "Hidden Valley",
      "Draper City Center",
    ],
    testimonials: [
      {
        name: "Aaron P.",
        location: "SunCrest, Draper",
        text: "Between work and kids I have zero time. Grenbee keeps the house spotless and I never think about it. Exactly what I wanted.",
        rating: 5,
      },
      {
        name: "Nicole T.",
        location: "Corner Canyon, Draper",
        text: "Big house, big yard, and they handle both flawlessly. Professional and always on schedule.",
        rating: 5,
      },
      {
        name: "Ben S.",
        location: "Hidden Valley, Draper",
        text: "Worth every dollar. The crew is meticulous and the online booking is effortless.",
        rating: 5,
      },
    ],
    faqs: [
      {
        question: "Do you serve all of Draper?",
        answer:
          "Yes — including SunCrest, Corner Canyon, Steep Mountain, and Hidden Valley. Enter your ZIP at checkout to confirm coverage.",
      },
      {
        question: "Can you handle larger homes and sloped lots?",
        answer:
          "Absolutely. Many Draper properties are larger with hillside yards — pricing scales with size and you'll see the exact quote before booking.",
      },
      {
        question: "Do you offer recurring service for busy schedules?",
        answer:
          "Yes — weekly, bi-weekly, or monthly with priority scheduling and a locked-in rate. Perfect for full schedules.",
      },
      {
        question: "Are your technicians insured?",
        answer:
          "Every Grenbee pro is background-checked, trained, and fully insured. Zero risk to you.",
      },
    ],
    seoTitle: "House Cleaning & Lawn Care in Draper, UT | Grenbee",
    seoDescription:
      "Premium house cleaning and lawn mowing in Draper, UT. Vetted insured pros for SunCrest & Corner Canyon, transparent pricing, recurring plans. Book online.",
    updatedAt: "",
  },

  // ── South Jordan ──────────────────────────────────────────────────────────
  {
    id: "south-jordan",
    slug: "south-jordan",
    city: "South Jordan",
    state: "UT",
    active: true,
    heroHeadline: "House Cleaning & Lawn Care in South Jordan, UT",
    heroSubtitle:
      "Home services for South Jordan's fast-growing neighborhoods — from Daybreak's lakeside homes to Kennecott's new builds. Book online, skip the phone tag.",
    introParagraph:
      "South Jordan is one of Utah's fastest-growing cities, anchored by the massive Daybreak community and full of young, dual-income families in new-construction homes. Grenbee keeps your home and yard looking their best with vetted local pros and transparent, up-front pricing.",
    serviceBlocks: [
      {
        serviceId: "house-cleaning",
        serviceName: "House Cleaning",
        localDescription:
          "From Daybreak townhomes to larger homes in Kennecott, we keep South Jordan spotless — kitchens, baths, floors, and the Utah hard-water spots that build up fast.",
      },
      {
        serviceId: "lawn-mowing",
        serviceName: "Lawn Mowing",
        localDescription:
          "Daybreak's tidy lots and HOA standards reward consistent care. We mow, edge, and blow off South Jordan yards on a weekly or bi-weekly schedule all season.",
      },
    ],
    neighborhoods: [
      "Daybreak",
      "Kennecott",
      "South Jordan Heights",
      "River Park",
      "Glenmoor",
      "Daybreak Lake",
    ],
    testimonials: [
      {
        name: "Lauren K.",
        location: "Daybreak, South Jordan",
        text: "Two kids, two jobs, no time. Grenbee is the best decision we've made — the house is always guest-ready.",
        rating: 5,
      },
      {
        name: "Diego M.",
        location: "Kennecott, South Jordan",
        text: "New build and they keep it looking new. Lawn's never looked better. Highly recommend.",
        rating: 5,
      },
      {
        name: "Ashley R.",
        location: "River Park, South Jordan",
        text: "Booking online took two minutes and the crew is fantastic. Reliable every single time.",
        rating: 5,
      },
    ],
    faqs: [
      {
        question: "Do you serve all of South Jordan?",
        answer:
          "Yes — including Daybreak, Kennecott, River Park, and South Jordan Heights. Confirm your ZIP at checkout.",
      },
      {
        question: "Do you work with HOA / Daybreak standards?",
        answer:
          "Yes. We keep yards tidy to community standards with consistent mowing, edging, and clean-up.",
      },
      {
        question: "Do you clean new-construction homes?",
        answer:
          "Definitely — recurring maintenance cleans and one-time deep cleans for new builds across South Jordan.",
      },
      {
        question: "Are your pros insured?",
        answer:
          "Every Grenbee technician is background-checked, trained, and fully insured.",
      },
    ],
    seoTitle: "House Cleaning & Lawn Care in South Jordan, UT | Grenbee",
    seoDescription:
      "Professional house cleaning and lawn mowing in South Jordan, UT. Daybreak & Kennecott specialists, vetted insured pros, transparent pricing. Book online.",
    updatedAt: "",
  },

  // ── Riverton ──────────────────────────────────────────────────────────────
  {
    id: "riverton",
    slug: "riverton",
    city: "Riverton",
    state: "UT",
    active: true,
    heroHeadline: "House Cleaning & Lawn Care in Riverton, UT",
    heroSubtitle:
      "Dependable home services for Riverton families — from larger lots in Rosecrest to established homes near the city center. Vetted, insured, and right on schedule.",
    introParagraph:
      "Riverton blends established family neighborhoods with newer growth and larger lots — homes that take real time to keep up. Grenbee handles your recurring house cleaning and lawn mowing with vetted local pros and pricing you can see before you book.",
    serviceBlocks: [
      {
        serviceId: "house-cleaning",
        serviceName: "House Cleaning",
        localDescription:
          "From Rosecrest to Oquirrh Shadows, we keep Riverton homes spotless — thorough, consistent cleans that handle larger family homes and Utah's hard-water buildup.",
      },
      {
        serviceId: "lawn-mowing",
        serviceName: "Lawn Mowing",
        localDescription:
          "Riverton's bigger lots mean more yard to manage. We keep it sharp with regular mowing, crisp edging, and full blow-off on a weekly or bi-weekly schedule.",
      },
    ],
    neighborhoods: [
      "Rosecrest",
      "Oquirrh Shadows",
      "Western Springs",
      "Riverton City Center",
      "Blackridge",
      "Maple Hills",
    ],
    testimonials: [
      {
        name: "Heather D.",
        location: "Rosecrest, Riverton",
        text: "Our yard is huge and Grenbee makes it look effortless every week. Friendly, punctual, reliable.",
        rating: 5,
      },
      {
        name: "Cody W.",
        location: "Oquirrh Shadows, Riverton",
        text: "Recurring cleans have been a game-changer for our family. The team is thorough and trustworthy.",
        rating: 5,
      },
      {
        name: "Monica L.",
        location: "Western Springs, Riverton",
        text: "Fair pricing and great results. Switched from another company and won't look back.",
        rating: 5,
      },
    ],
    faqs: [
      {
        question: "Do you serve all of Riverton?",
        answer:
          "Yes — including Rosecrest, Oquirrh Shadows, Western Springs, and Blackridge. Confirm your ZIP at checkout.",
      },
      {
        question: "Can you handle larger lots and family homes?",
        answer:
          "Absolutely. Riverton has many bigger properties — pricing scales with size and you'll see the quote up front.",
      },
      {
        question: "Can I set up recurring service?",
        answer:
          "Yes — weekly, bi-weekly, or monthly with priority scheduling and a locked-in rate.",
      },
      {
        question: "Are your technicians insured?",
        answer:
          "Every Grenbee pro is background-checked, trained, and fully insured.",
      },
    ],
    seoTitle: "House Cleaning & Lawn Care in Riverton, UT | Grenbee",
    seoDescription:
      "Professional house cleaning and lawn mowing in Riverton, UT. Vetted insured pros, larger-lot specialists, transparent pricing, recurring plans. Book online.",
    updatedAt: "",
  },

  // ── Springville ────────────────────────────────────────────────────────────
  {
    id: "springville",
    slug: "springville",
    city: "Springville",
    state: "UT",
    active: true,
    heroHeadline: "House Cleaning & Lawn Care in Springville, UT",
    heroSubtitle:
      "Trusted home services for Springville — Utah's Art City — from Hobble Creek homes to the growing east bench. Transparent pricing, no surprises.",
    introParagraph:
      "Springville mixes historic Art City charm with steady new growth, from established homes near Main Street to newer builds on the east bench. Grenbee pairs you with vetted local pros for recurring house cleaning and lawn mowing, with pricing you see before you book.",
    serviceBlocks: [
      {
        serviceId: "house-cleaning",
        serviceName: "House Cleaning",
        localDescription:
          "From Hobble Creek to the east bench, we keep Springville homes spotless — and tackle the stubborn hard-water spots Utah leaves on glass, fixtures, and showers.",
      },
      {
        serviceId: "lawn-mowing",
        serviceName: "Lawn Mowing",
        localDescription:
          "We keep Springville lawns crisp with regular mowing, edging, and full blow-off — weekly or bi-weekly through the Utah growing season.",
      },
    ],
    neighborhoods: [
      "Hobble Creek",
      "Spring Creek",
      "Springville East Bench",
      "Art City",
      "Canyon",
      "West Fields",
    ],
    testimonials: [
      {
        name: "Kim B.",
        location: "Spring Creek, Springville",
        text: "Reliable and thorough — our home has never looked better. Booking online is so easy.",
        rating: 5,
      },
      {
        name: "Travis H.",
        location: "Springville East Bench",
        text: "Great mowing service all summer. Always on time and the edging is perfect.",
        rating: 5,
      },
      {
        name: "Dana F.",
        location: "Hobble Creek, Springville",
        text: "Professional, insured, and genuinely kind. Highly recommend to any Springville family.",
        rating: 5,
      },
    ],
    faqs: [
      {
        question: "Do you serve all of Springville?",
        answer:
          "Yes — including Hobble Creek, Spring Creek, the east bench, and Art City. Confirm your ZIP at checkout.",
      },
      {
        question: "Can you handle Utah hard water?",
        answer:
          "Yes — we use hard-water-specific products on glass, fixtures, and showers to cut through mineral buildup.",
      },
      {
        question: "Can I book recurring service?",
        answer:
          "Yes — weekly, bi-weekly, or monthly with priority scheduling and a locked-in rate.",
      },
      {
        question: "Are your technicians insured?",
        answer:
          "Every Grenbee pro is background-checked, trained, and fully insured.",
      },
    ],
    seoTitle: "House Cleaning & Lawn Care in Springville, UT | Grenbee",
    seoDescription:
      "Professional house cleaning and lawn mowing in Springville, UT. Hard-water cleaning experts, vetted insured pros, transparent pricing. Book online.",
    updatedAt: "",
  },

  // ── Salem ───────────────────────────────────────────────────────────────────
  {
    id: "salem",
    slug: "salem",
    city: "Salem",
    state: "UT",
    active: true,
    heroHeadline: "House Cleaning & Lawn Care in Salem, UT",
    heroSubtitle:
      "Dependable home services for Salem's close-knit neighborhoods — from homes around Salem Pond to the larger lots in Salem Hills. Vetted, insured, on schedule.",
    introParagraph:
      "Salem is a tight-knit, high-homeownership town of larger lots and family homes against the foothills — properties that take time to maintain. Grenbee delivers reliable house cleaning and lawn mowing with vetted local pros and transparent, up-front pricing.",
    serviceBlocks: [
      {
        serviceId: "house-cleaning",
        serviceName: "House Cleaning",
        localDescription:
          "From homes near Salem Pond to Salem Hills, we keep your house spotless — thorough cleans that handle larger family homes and Utah's hard-water buildup.",
      },
      {
        serviceId: "lawn-mowing",
        serviceName: "Lawn Mowing",
        localDescription:
          "Salem's larger lots reward consistent care. We keep your yard sharp with regular mowing, edging, and blow-off on a weekly or bi-weekly schedule.",
      },
    ],
    neighborhoods: [
      "Salem Pond",
      "Salem Hills",
      "Loafer View",
      "Salem City Center",
      "Knoll Estates",
      "Foothills",
    ],
    testimonials: [
      {
        name: "Tara J.",
        location: "Salem Hills, Salem",
        text: "Big yard and they make it look effortless every week. Reliable and friendly — exactly what we needed.",
        rating: 5,
      },
      {
        name: "Greg N.",
        location: "Salem Pond, Salem",
        text: "Recurring cleaning has freed up our weekends completely. The crew is thorough and trustworthy.",
        rating: 5,
      },
      {
        name: "Bri C.",
        location: "Knoll Estates, Salem",
        text: "Fair price, great work, easy online booking. Couldn't ask for more.",
        rating: 5,
      },
    ],
    faqs: [
      {
        question: "Do you serve all of Salem?",
        answer:
          "Yes — including Salem Pond, Salem Hills, and the foothills. Confirm your ZIP at checkout.",
      },
      {
        question: "Can you handle larger foothill lots?",
        answer:
          "Absolutely. Many Salem properties sit on bigger lots — pricing scales with size and you'll see the quote up front.",
      },
      {
        question: "Can I set up recurring service?",
        answer:
          "Yes — weekly, bi-weekly, or monthly with priority scheduling and a locked-in rate.",
      },
      {
        question: "Are your technicians insured?",
        answer:
          "Every Grenbee pro is background-checked, trained, and fully insured.",
      },
    ],
    seoTitle: "House Cleaning & Lawn Care in Salem, UT | Grenbee",
    seoDescription:
      "Professional house cleaning and lawn mowing in Salem, UT. Vetted insured pros, larger-lot specialists, transparent pricing, recurring plans. Book online.",
    updatedAt: "",
  },
];

/** Convenience: slugs of all launch areas. */
export const LAUNCH_AREA_SLUGS = LAUNCH_AREAS.map((a) => a.slug);

/** Cities shown as "coming soon" on the /areas hub (not yet served / no landing). */
export const COMING_SOON_AREAS: { id: string; city: string; state: string }[] = [
  { id: "lehi", city: "Lehi", state: "UT" },
  { id: "american-fork", city: "American Fork", state: "UT" },
  { id: "orem", city: "Orem", state: "UT" },
  { id: "provo", city: "Provo", state: "UT" },
  { id: "sandy", city: "Sandy", state: "UT" },
];
