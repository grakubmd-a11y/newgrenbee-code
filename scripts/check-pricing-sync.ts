/**
 * Pricing sync guard.
 *
 * The server price validator (api/_pricing.js) is intentionally independent of
 * the client config so the payment path never depends on bundling client code.
 * The trade-off is that the two can drift silently. This script asserts they
 * stay in sync and exits non-zero (with a clear message) if they don't.
 *
 * Run: npm run check:pricing   (uses tsx — understands the TS imports below)
 *
 * Checks:
 *  1. basePrice / pricePerUnit in SERVICE_PRICING match SERVICES_DATA.
 *  2. Every service in SERVICES_DATA has a SERVICE_PRICING entry (catches a new
 *     service shipped without server pricing — e.g. the turnover case).
 *  3. ALLOWED_MODIFIERS[service][factor] equals the set of priceModifier values
 *     for that factor in config.
 *  4. Discount/fee constants match between server (_pricing.js) and client
 *     (pricingService.ts).
 */
import { SERVICES_DATA } from "../packages/config/index.ts";
import {
  RECURRENCE_DISCOUNT_RATES,
  MEMBERSHIP_DISCOUNT_RATES,
  SAME_DAY_FEE as CLIENT_SAME_DAY_FEE,
  TWO_TECH_FEE as CLIENT_TWO_TECH_FEE,
} from "../packages/firebase/services/pricingService.ts";
import {
  SERVICE_PRICING,
  ALLOWED_MODIFIERS,
  FREQUENCY_DISCOUNTS,
  MEMBERSHIP_DISCOUNTS,
  SAME_DAY_FEE as SERVER_SAME_DAY_FEE,
  TWO_TECH_FEE as SERVER_TWO_TECH_FEE,
} from "../api/_pricing.js";

const errors: string[] = [];
const ok = (msg: string) => console.log(`  ✓ ${msg}`);

// ── 1 & 2: basePrice/pricePerUnit + coverage ────────────────────────────────
for (const svc of SERVICES_DATA) {
  const server = (SERVICE_PRICING as Record<string, { basePrice: number; pricePerUnit: number }>)[svc.id];
  if (!server) {
    errors.push(
      `SERVICE_PRICING is missing "${svc.id}" — config has it but api/_pricing.js does not. ` +
        `calculatePrice() would throw "Unknown service" for it in production.`,
    );
    continue;
  }
  if (server.basePrice !== svc.basePrice) {
    errors.push(`basePrice mismatch for "${svc.id}": config=${svc.basePrice} server=${server.basePrice}`);
  }
  if (server.pricePerUnit !== svc.pricePerUnit) {
    errors.push(`pricePerUnit mismatch for "${svc.id}": config=${svc.pricePerUnit} server=${server.pricePerUnit}`);
  }
}
if (!errors.length) ok(`basePrice/pricePerUnit + coverage for ${SERVICES_DATA.length} services`);

// ── 3: ALLOWED_MODIFIERS ⊆/= config factor priceModifiers ───────────────────
const allowed = ALLOWED_MODIFIERS as Record<string, Record<string, Set<number>>>;
for (const [serviceId, factors] of Object.entries(allowed)) {
  const svc = SERVICES_DATA.find((s) => s.id === serviceId);
  if (!svc) {
    errors.push(`ALLOWED_MODIFIERS has service "${serviceId}" that is not in config SERVICES_DATA.`);
    continue;
  }
  for (const [factorName, allowedSet] of Object.entries(factors)) {
    const factor = svc.factors.find((f) => f.name === factorName);
    if (!factor) {
      errors.push(`ALLOWED_MODIFIERS["${serviceId}"]["${factorName}"] has no matching factor in config.`);
      continue;
    }
    const configSet = new Set(factor.options.map((o) => o.priceModifier));
    const a = [...allowedSet].sort((x, y) => x - y).join(",");
    const c = [...configSet].sort((x, y) => x - y).join(",");
    if (a !== c) {
      errors.push(
        `Modifier set mismatch for "${serviceId}".${factorName}: ` +
          `server=[${a}] config=[${c}]`,
      );
    }
  }
}
if (!errors.some((e) => e.includes("Modifier") || e.includes("ALLOWED_MODIFIERS"))) {
  ok("ALLOWED_MODIFIERS match config factor options");
}

// ── 4: shared discount/fee constants (server vs client) ─────────────────────
const cmpMap = (label: string, server: Record<string, number>, client: Record<string, number>) => {
  const keys = new Set([...Object.keys(server), ...Object.keys(client)]);
  for (const k of keys) {
    if (server[k] !== client[k]) {
      errors.push(`${label} mismatch for "${k}": server=${server[k]} client=${client[k]}`);
    }
  }
};
cmpMap("Frequency/recurrence discount", FREQUENCY_DISCOUNTS as Record<string, number>, RECURRENCE_DISCOUNT_RATES as Record<string, number>);
cmpMap("Membership discount", MEMBERSHIP_DISCOUNTS as Record<string, number>, MEMBERSHIP_DISCOUNT_RATES as Record<string, number>);
if (SERVER_SAME_DAY_FEE !== CLIENT_SAME_DAY_FEE) {
  errors.push(`SAME_DAY_FEE mismatch: server=${SERVER_SAME_DAY_FEE} client=${CLIENT_SAME_DAY_FEE}`);
}
if (SERVER_TWO_TECH_FEE !== CLIENT_TWO_TECH_FEE) {
  errors.push(`TWO_TECH_FEE mismatch: server=${SERVER_TWO_TECH_FEE} client=${CLIENT_TWO_TECH_FEE}`);
}
if (!errors.some((e) => e.includes("discount") || e.includes("FEE"))) {
  ok("discount rates + SAME_DAY_FEE + TWO_TECH_FEE match (server ↔ client)");
}

// ── Result ───────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`\n✗ Pricing sync FAILED — ${errors.length} issue(s):`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error(
    "\nFix: update api/_pricing.js (and packages/firebase/services/pricingService.ts for shared constants) to match packages/config/index.ts.",
  );
  process.exit(1);
}
console.log("\n✓ Pricing is in sync across config, server (_pricing.js), and client (pricingService.ts).");
