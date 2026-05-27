/**
 * api/_mailer.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared email helper built on Resend (https://resend.com).
 *
 * Env vars:
 *   RESEND_API_KEY   — re_... from Resend dashboard (required to send)
 *   NOTIFY_FROM      — "Greenbee <noreply@yourdomain.com>"  (optional override)
 *
 * All functions resolve silently — a missing API key or network error never
 * throws to the caller so it never blocks the main request path.
 *
 * Templates
 * ─────────
 *   sendBookingConfirmation(booking)       → customer
 *   sendStaffAssignmentNotice(booking, staff) → technician
 *   sendRecurringChargeReceipt(plan, booking) → customer
 *   sendStatusUpdateNotice(booking)        → customer  (dispatched / completed)
 */

import { Resend } from "resend";

const apiKey  = process.env.RESEND_API_KEY || "";
const FROM    = process.env.NOTIFY_FROM    || "Greenbee <noreply@grenbee.app>";
const resend  = apiKey && !apiKey.includes("REPLACE_ME") ? new Resend(apiKey) : null;

// ── Brand colour helpers ──────────────────────────────────────────────────────
const GREEN   = "#0ead6b";
const DARK    = "#0a2e1e";
const BG      = "#f0faf4";

// ── Base layout ───────────────────────────────────────────────────────────────
function wrap(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);">
        <!-- header -->
        <tr>
          <td style="background:${DARK};padding:24px 32px;">
            <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">
              🌿 Greenbee
            </span>
          </td>
        </tr>
        <!-- body -->
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>
        <!-- footer -->
        <tr>
          <td style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:11px;color:#999;text-align:center;">
              Greenbee Home Services · This is an automated message, please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function h1(text) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:${DARK};">${text}</h1>`;
}
function p(text, style = "") {
  return `<p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.6;${style}">${text}</p>`;
}
function badge(text, color = GREEN) {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;background:${color}20;color:${color};font-size:11px;font-weight:700;border:1px solid ${color}40;">${text}</span>`;
}
function detailRow(label, value) {
  return `<tr>
    <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#888;white-space:nowrap;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:${DARK};font-weight:600;">${value}</td>
  </tr>`;
}
function detailTable(rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fdf9;border:1px solid #d4edda;border-radius:12px;margin:20px 0;overflow:hidden;">
    <tbody>${rows.join("")}</tbody>
  </table>`;
}
function cta(label, url) {
  return `<a href="${url}" style="display:inline-block;padding:12px 28px;background:${GREEN};color:#fff;font-size:13px;font-weight:800;text-decoration:none;border-radius:10px;margin-top:8px;">${label}</a>`;
}
function divider() {
  return `<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">`;
}

// ── Currency & date helpers ───────────────────────────────────────────────────
function usd(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}
function friendlyDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m,10)-1]} ${d}, ${y}`;
}

// ── Template: Booking Confirmation (→ customer) ───────────────────────────────
export function buildBookingConfirmationEmail(booking) {
  const freq = booking.frequency && booking.frequency !== "once"
    ? ` · ${booking.frequency.charAt(0).toUpperCase() + booking.frequency.slice(1)} plan`
    : "";

  const body = `
    ${h1("Your booking is confirmed! 🎉")}
    ${p(`Hi ${booking.customerName || "there"}, we received your booking for <strong>${booking.serviceName}</strong>. We'll reach out to confirm your technician shortly.`)}
    ${detailTable([
      detailRow("Booking ID",    booking.id),
      detailRow("Service",       booking.serviceName + (booking.units > 1 ? ` · ${booking.units} units` : "")),
      detailRow("Date",          friendlyDate(booking.bookingDate)),
      detailRow("Arrival Window",booking.timeSlot || "—"),
      detailRow("Address",       booking.address || "—"),
      detailRow("Total",         usd(booking.totalCost) + freq),
    ])}
    ${booking.frequency !== "once"
      ? p(`<strong>Recurring plan:</strong> We'll automatically schedule your next service ${booking.frequency} — you can manage or cancel anytime from <strong>Mi Cuenta → Mis Planes</strong>.`, "background:#f0fdf4;padding:12px 16px;border-radius:10px;border-left:3px solid ${GREEN};")
      : ""}
    ${divider()}
    ${p("Questions? Reply to this email or contact us through the website.", "color:#888;font-size:12px;")}
  `;

  return {
    subject: `Booking confirmed — ${booking.serviceName} on ${friendlyDate(booking.bookingDate)}`,
    html:    wrap(`Booking confirmed — ${booking.serviceName}`, body),
  };
}

// ── Template: Staff Assignment Notice (→ technician) ─────────────────────────
export function buildStaffAssignmentEmail(booking, staff) {
  const body = `
    ${h1("New job assigned to you 📋")}
    ${p(`Hi ${staff.name || "there"}, you've been assigned to the following booking. Please review the details and be ready for the appointment window.`)}
    ${detailTable([
      detailRow("Booking ID",    booking.id),
      detailRow("Service",       booking.serviceName),
      detailRow("Date",          friendlyDate(booking.bookingDate)),
      detailRow("Arrival Window",booking.timeSlot || "—"),
      detailRow("Address",       booking.address || "—"),
      detailRow("Customer",      booking.customerName || "—"),
      detailRow("Phone",         booking.phone || "—"),
      booking.notes ? detailRow("Notes", booking.notes) : "",
    ].filter(Boolean))}
    ${divider()}
    ${p("If you have any scheduling conflicts, contact your manager immediately.", "color:#888;font-size:12px;")}
  `;

  return {
    subject: `New assignment: ${booking.serviceName} on ${friendlyDate(booking.bookingDate)}`,
    html:    wrap("New job assigned", body),
  };
}

// ── Template: Recurring Charge Receipt (→ customer) ──────────────────────────
export function buildRecurringReceiptEmail(plan, booking) {
  const body = `
    ${h1("Recurring service receipt 🔁")}
    ${p(`Hi, your recurring <strong>${plan.serviceName}</strong> has been scheduled and payment processed.`)}
    ${detailTable([
      detailRow("Service",         plan.serviceName),
      detailRow("Service Date",    friendlyDate(booking?.bookingDate || plan.lastChargeAt)),
      detailRow("Amount Charged",  usd(plan.amount)),
      detailRow("Next Service",    friendlyDate(plan.nextChargeAt)),
      detailRow("Plan Frequency",  plan.recurrence),
    ])}
    ${p("You can pause, skip, or cancel your recurring plan at any time from <strong>Mi Cuenta → Mis Planes</strong>.")}
    ${divider()}
    ${p("Thank you for choosing Greenbee! 🌿", "color:#888;font-size:12px;")}
  `;

  return {
    subject: `Receipt — ${plan.serviceName} recurring service`,
    html:    wrap("Recurring service receipt", body),
  };
}

// ── Template: Status Update (→ customer) ────────────────────────────────────
export function buildStatusUpdateEmail(booking) {
  const statusMessages = {
    dispatched:    { emoji: "🚗", title: "Your technician is on the way!", line: "Your technician has been dispatched and is heading to your location." },
    "in-progress": { emoji: "🔧", title: "Service in progress",           line: "Your technician has arrived and the service is underway."         },
    completed:     { emoji: "✅", title: "Service completed!",             line: "Your service has been marked as completed. We hope everything went perfectly!"  },
  };

  const msg = statusMessages[booking.status] || { emoji: "📋", title: "Booking update", line: `Your booking status is now: ${booking.status}.` };

  const body = `
    ${h1(`${msg.emoji} ${msg.title}`)}
    ${p(`Hi ${booking.customerName || "there"}, ${msg.line}`)}
    ${detailTable([
      detailRow("Booking ID", booking.id),
      detailRow("Service",    booking.serviceName),
      detailRow("Date",       friendlyDate(booking.bookingDate)),
      detailRow("Address",    booking.address || "—"),
      booking.assignedStaffName ? detailRow("Technician", booking.assignedStaffName) : "",
    ].filter(Boolean))}
    ${booking.status === "completed"
      ? p("We'd love to hear about your experience! Leave a review on our website.", "background:#f0fdf4;padding:12px 16px;border-radius:10px;")
      : ""}
    ${divider()}
    ${p("Questions? Contact us through the website.", "color:#888;font-size:12px;")}
  `;

  return {
    subject: `${msg.title} — ${booking.serviceName}`,
    html:    wrap(msg.title, body),
  };
}

// ── Abandoned checkout recovery email ────────────────────────────────────────

/**
 * @param {{ customerName:string, serviceName?:string, estimatedValue?:number }} lead
 * @param {{ bookingUrl?:string }} opts
 */
export function buildAbandonedCheckoutEmail(lead, opts = {}) {
  const name    = lead.customerName?.split(" ")[0] || "there";
  const service = lead.serviceName  || "our service";
  const value   = lead.estimatedValue > 0 ? `$${Number(lead.estimatedValue).toFixed(0)}` : null;
  const bookingUrl = opts.bookingUrl || "https://grenbee.com/#booking";

  const body = `
    ${p(`Hi ${name} 👋`)}
    ${p(`We noticed you started booking <strong>${service}</strong> with us but didn't complete your reservation.`)}
    ${p("It only takes a minute to finish — your details are ready and waiting:")}
    <div style="text-align:center;margin:28px 0;">
      <a href="${bookingUrl}"
         style="background:${GREEN};color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:800;font-size:15px;display:inline-block;">
        Complete My Booking${value ? ` — ${value}` : ""}
      </a>
    </div>
    ${p("If you have any questions or need a custom quote, just reply to this email.", "color:#888;font-size:13px;")}
    ${divider()}
    ${p("You received this because you started a booking on Greenbee. If this wasn't you, please ignore it.", "color:#aaa;font-size:11px;")}
  `;

  return {
    subject: `Did you forget something? Your ${service} booking is waiting`,
    html:    wrap("Your booking is waiting ✨", body),
  };
}

// ── Send helper ───────────────────────────────────────────────────────────────

/**
 * Send a single email. Resolves silently on success or any error.
 * @param {string} to     Recipient email address
 * @param {string} subject
 * @param {string} html
 */
export async function sendEmail(to, subject, html) {
  if (!resend) {
    console.warn("[mailer] RESEND_API_KEY not configured — email not sent:", subject);
    return { sent: false, reason: "not-configured" };
  }
  if (!to || !to.includes("@")) {
    console.warn("[mailer] Invalid recipient address:", to);
    return { sent: false, reason: "invalid-address" };
  }
  try {
    const result = await resend.emails.send({ from: FROM, to: [to], subject, html });
    return { sent: true, id: result?.data?.id };
  } catch (err) {
    console.error("[mailer] Send failed:", err?.message);
    return { sent: false, reason: err?.message };
  }
}
