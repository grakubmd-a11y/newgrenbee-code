import OpenAI from "openai";
import admin from "firebase-admin";
import { getFirestore as _adminGetFs } from "firebase-admin/firestore";
import { Resend } from "resend";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const hasOpenAiKey =
  typeof OPENAI_API_KEY === "string" &&
  OPENAI_API_KEY.trim().length > 0 &&
  !OPENAI_API_KEY.includes("REPLACE_ME");
const openai = hasOpenAiKey ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend =
  RESEND_API_KEY && !RESEND_API_KEY.includes("REPLACE_ME")
    ? new Resend(RESEND_API_KEY)
    : null;
const FROM = process.env.NOTIFY_FROM || "Grenbee <noreply@grenbee.app>";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || "support@grenbee.com";

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

let _db = null;
function getFirestore() {
  if (_db) return _db;
  const json =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!json || json.includes("REPLACE_ME")) return null;
  try {
    const app = admin.apps.length
      ? admin.apps[0]
      : admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
    const dbId = process.env.FIREBASE_DATABASE_ID;
    _db = dbId ? _adminGetFs(app, dbId) : _adminGetFs(app);
    return _db;
  } catch {
    return null;
  }
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function getServices() {
  const db = getFirestore();
  if (!db) return { error: "services data unavailable" };
  try {
    const snap = await db.collection("services").where("active", "==", true).get();
    const services = snap.docs.map((d) => {
      const data = d.data();
      // Return the fields most useful for pricing conversations
      return {
        id: data.id || d.id,
        name: data.name,
        basePrice: data.basePrice,
        pricePerUnit: data.pricePerUnit ?? 0,
        unitName: data.unitName ?? "",
        unitLabel: data.unitLabel ?? "",
        minUnits: data.minUnits ?? 0,
        maxUnits: data.maxUnits ?? 1,
        tagline: data.tagline ?? "",
        description: data.description ?? "",
        includedSpecs: data.includedSpecs ?? [],
        requiresManualReview: data.requiresManualReview ?? false,
        factors: (data.factors ?? []).map((f) => ({
          name: f.name,
          label: f.label,
          options: (f.options ?? []).map((o) => ({
            label: o.label,
            priceModifier: o.priceModifier ?? 0,
          })),
        })),
      };
    });
    return { services };
  } catch (err) {
    return { error: "could not fetch services", detail: err?.message };
  }
}

async function checkCoverage({ zipCode }) {
  const db = getFirestore();
  if (!db) return { covered: false, reason: "coverage data unavailable" };
  try {
    const snap = await db.collection("coverage").doc(String(zipCode)).get();
    if (snap.exists) {
      const data = snap.data() || {};
      return { covered: true, area: data.area || zipCode, notes: data.notes || "" };
    }
    return { covered: false };
  } catch {
    return { covered: false, reason: "error checking coverage" };
  }
}

async function getUserBookings({ userId }) {
  if (!userId) return { bookings: [] };
  const db = getFirestore();
  if (!db) return { bookings: [] };
  try {
    const snap = await db
      .collection("bookings")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    const bookings = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        serviceName: data.serviceName || data.serviceId || "Unknown",
        status: data.status || "unknown",
        bookingDate: data.bookingDate || "",
        total: data.total || data.totalCents ? (data.totalCents / 100) : null,
      };
    });
    return { bookings };
  } catch {
    return { bookings: [] };
  }
}

function redirectToBooking({ serviceId, country = "us" }) {
  const url = `/${country}/book?service=${encodeURIComponent(serviceId)}`;
  return { url };
}

async function escalateToHuman({ userId, lastMessage }) {
  if (resend) {
    try {
      await resend.emails.send({
        from: FROM,
        to: [SUPPORT_EMAIL],
        subject: "Chat escalated to human — Grenbee",
        html: `<p>A customer chat was escalated to human support.</p>
               <p><strong>User ID:</strong> ${userId || "anonymous"}</p>
               <p><strong>Last message:</strong> ${String(lastMessage || "").replace(/</g, "&lt;")}</p>`,
      });
    } catch { /* non-fatal */ }
  }
  return { escalated: true };
}

// ── OpenAI call ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the customer support assistant for Grenbee, a professional home services company operating in Utah County, UT.

## Your personality
Be friendly, concise, and professional. Always respond in the same language the user writes in — English or Spanish. Never invent facts.

## What Grenbee does
Grenbee provides professional home services booked entirely online: instant pricing, same-week availability, real-time job status updates. Every technician is vetted, background-checked, licensed, and fully insured.

## Active services (ALWAYS call get_services before quoting prices — Firestore is the source of truth)
These are the currently bookable services. Use get_services to get live base prices and all pricing factors:

- **House Cleaning** (id: house-cleaning) — Base $85 + $25/extra room. Configurable by bedrooms, bathrooms, clean type (standard/deep/move-in), pets, appliance interiors, linens, interior windows, clutter level.
- **TV Installation** (id: tv-installation) — Base $95 + $40/TV. Configurable by screen size (up to 43" free, 86"+ +$45), mount type (flat/tilting/full-motion), wall material (drywall free, concrete +$30), wire hiding, soundbar setup.
- **Lawn Mowing** (id: lawn-mowing) — Base $45 + $15 per 1,000 sq ft. Configurable by grass overgrowth (regular free, wild brush +$65), clippings handling, edging & shrub trimming, debris cleanup, weed removal.
- **Vacation Rental Turnover** (id: vacation-rental-turnover) — Base $89. Includes before/after photos, guest-ready staging, full sanitizing, trash removal, supplies check. Configurable by bedrooms, bathrooms, amenity restocking, laundry, express turnover speed. ⚠️ This service requires manual team review before dispatch — after booking the team contacts the host within 2 hours.

Furniture Assembly, Pressure Washing, and Wall Mounting exist in the system but are currently inactive (not bookable).

## Recurring frequency discounts
Weekly, bi-weekly, and monthly bookings receive a 10% discount. Membership plans offer additional savings:
- Basic: 1 visit/month, $59–$179/mo
- Standard: 2 visits/month, $109–$329/mo
- Premium: 4 visits/month, $199–$599/mo + $100/mo service credits

## Coverage area
Currently serving **Utah County, UT**: Mapleton, Spanish Fork, Springville, Payson, Salem, and surrounding communities. Salt Lake County (Salt Lake City, Draper, Sandy) is coming soon — customers outside current coverage can join the waitlist. No travel surcharge within the standard coverage zone; edge-of-coverage areas may have a small distance fee shown clearly at checkout.

## Payment & booking
- Payment is by card (Visa, Mastercard, Amex, Discover, Apple Pay, Google Pay) processed via Stripe.
- **Card is authorized (held) at booking time — charged only after the technician completes the job.** If the service doesn't happen, the hold releases within 3–5 days.
- An account is required to confirm a booking.
- Same-day booking is possible if slots are available; 48-hour advance booking recommended for best availability.
- Weekend (Saturday/Sunday) slots available; Sunday books fast.

## Scheduling & cancellations
- Reschedule free up to 24 hours before the appointment. Within 24 hours: $15 rebooking fee.
- Cancel with at least 7 days' notice before next billing date (for memberships). Cancellations within 48 hours of a scheduled visit may incur a last-minute cancellation fee.
- If the provider is more than 30 minutes late with no notice: customer is entitled to a $10 discount on that booking.
- Recurring bookings can be paused or cancelled at any time with at least 72 hours' notice.

## Quality & guarantees
- **Satisfaction guarantee**: If not satisfied, contact Grenbee within 48 hours — a provider will return to redo the work at no charge, or a partial refund is issued.
- **Damage**: All providers carry general liability insurance. Customer must document with photos and report within 48 hours.
- Default cleaning products are EPA-approved and eco-friendly, safe for children and pets. Special preferences can be noted in the booking.

## Support hours
Mon–Sat 8 AM – 6 PM MT.

## Tool usage rules
- **get_services**: Call this FIRST whenever the user asks about pricing, services available, or what is included. Never quote prices from memory.
- **check_coverage**: Call when user provides a zip code or asks if their area is covered.
- **get_user_bookings**: Call when a logged-in user asks about their bookings, status, or history.
- **redirect_to_booking**: Call when a user wants to book a service. Always pass the correct serviceId.
- **escalate_to_human**: Call when you cannot answer, when the user has a complaint, damage claim, or explicitly asks to speak to a person. Do not escalate for questions you can answer from this prompt.`;


const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_services",
      description: "Returns the list of available Grenbee services with names, IDs, base prices and descriptions.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "check_coverage",
      description: "Checks whether Grenbee operates in the given zip code.",
      parameters: {
        type: "object",
        properties: {
          zipCode: { type: "string", description: "5-digit US zip code to check" },
        },
        required: ["zipCode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_bookings",
      description: "Returns the last 5 bookings for a logged-in user.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "Firebase UID of the current user" },
        },
        required: ["userId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "redirect_to_booking",
      description: "Returns a URL to the booking page for a specific service. Use when the user wants to book.",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "string", description: "Service ID (e.g. house-cleaning)" },
          country:   { type: "string", description: "Country code prefix, e.g. us or cl" },
        },
        required: ["serviceId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human",
      description: "Sends an escalation email to the support team when the bot cannot handle the request.",
      parameters: {
        type: "object",
        properties: {
          userId:      { type: "string" },
          lastMessage: { type: "string", description: "The last user message that triggered escalation" },
        },
        required: [],
      },
    },
  },
];

async function callTool(name, args, context) {
  switch (name) {
    case "get_services":
      return getServices();
    case "check_coverage":
      return checkCoverage(args);
    case "get_user_bookings":
      return getUserBookings(args);
    case "redirect_to_booking":
      return redirectToBooking({ ...args, country: context.country || "us" });
    case "escalate_to_human":
      return escalateToHuman({ ...args, userId: context.userId });
    default:
      return { error: "unknown tool" };
  }
}

async function runOpenAI(messages, context) {
  // Simple agentic loop: allow up to 5 tool rounds to prevent runaway loops.
  const MAX_ROUNDS = 5;
  let action = null;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });

    const choice = completion.choices?.[0];
    const msg = choice?.message;

    if (!msg) throw new Error("Empty response from OpenAI");

    // Add assistant message to history
    messages.push(msg);

    if (choice.finish_reason === "tool_calls" && msg.tool_calls?.length) {
      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        msg.tool_calls.map(async (tc) => {
          let args = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }

          const result = await callTool(tc.function.name, args, context);

          // Capture client-side actions from specific tools
          if (tc.function.name === "redirect_to_booking" && result.url) {
            action = { type: "redirect_booking", payload: { url: result.url } };
          }
          if (tc.function.name === "escalate_to_human") {
            action = { type: "escalate", payload: {} };
          }

          return {
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          };
        })
      );

      messages.push(...toolResults);
      continue; // next round
    }

    // No more tool calls — return final text
    return { reply: msg.content || "", action };
  }

  return { reply: "I'm sorry, I was unable to complete your request. Please try again.", action };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!openai) {
    return sendJson(res, 500, { error: "OpenAI is not configured. Add OPENAI_API_KEY on the server." });
  }

  const body = parseBody(req);
  const { messages: clientMessages = [], userId = "", country = "us", lang = "en" } = body;

  if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
    return sendJson(res, 400, { error: "messages array is required." });
  }

  // Sanitize client messages — only allow role/content fields
  const safeMessages = clientMessages
    .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  if (safeMessages.length === 0) {
    return sendJson(res, 400, { error: "No valid messages provided." });
  }

  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...safeMessages];
  const context = { userId, country, lang };

  try {
    const { reply, action } = await runOpenAI(messages, context);
    return sendJson(res, 200, { reply, ...(action ? { action } : {}) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Chat service error.";
    return sendJson(res, 500, { error: msg });
  }
}
