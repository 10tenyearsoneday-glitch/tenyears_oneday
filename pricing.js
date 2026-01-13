// pricing.js — TEN YEARS ONE DAY (SINGLE SOURCE OF TRUTH)

const GAS_PRODUCTS_URL =
  "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

let __TEN_SETTINGS = null;
let __TEN_SETTINGS_LOADING = false;

/* ========= utils ========= */
export const truthy = (v) =>
  v === true ||
  v === 1 ||
  v === "1" ||
  String(v).trim().toUpperCase() === "TRUE";

export const num = (v, d = 0) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : d;
};

export const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;

/* ========= settings ========= */
export async function getSettings() {
  if (__TEN_SETTINGS || __TEN_SETTINGS_LOADING) return __TEN_SETTINGS || {};
  __TEN_SETTINGS_LOADING = true;

  try {
    const res = await fetch(`${GAS_PRODUCTS_URL}?path=settings`, { cache: "no-store" });
    const out = await res.json().catch(() => null);

    if (out && typeof out === "object") {
      __TEN_SETTINGS = out.ok && out.data ? out.data : out;
    } else {
      __TEN_SETTINGS = {};
    }
  } catch {
    __TEN_SETTINGS = {};
  } finally {
    __TEN_SETTINGS_LOADING = false;
  }

  return __TEN_SETTINGS;
}

/* ========= pricing ========= */
export function calcSubtotal(items) {
  return items.reduce((s, it) => s + num(it.price) * num(it.qty), 0);
}

export function calcShipping(subtotal, s) {
  if (!truthy(s.shipping_enabled)) return 0;

  const fee = num(s.shipping_fee, 0);
  const th = num(s.free_shipping_threshold, 0);

  if (fee <= 0) return 0;
  if (th > 0 && subtotal >= th) return 0;

  return fee;
}

export function calcDiscount(subtotal, s, ctx = {}) {
  let rate = 1;

  if (ctx.firstPurchase && s.first_purchase_discount)
    rate *= num(s.first_purchase_discount, 1);

  if (ctx.birthday && s.birthday_discount)
    rate *= num(s.birthday_discount, 1);

  return Math.round(subtotal * (1 - rate));
}

export function calcTotal(items, s, ctx = {}) {
  const subtotal = calcSubtotal(items);
  const discount = calcDiscount(subtotal, s, ctx);
  const shipping = calcShipping(subtotal - discount, s);
  const total = subtotal - discount + shipping;

  return { subtotal, discount, shipping, total };
}
