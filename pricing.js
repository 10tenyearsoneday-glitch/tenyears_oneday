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
    __TEN_SETTINGS = out && typeof out === "object"
      ? (out.ok && out.data ? out.data : out)
      : {};
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

export function calcShipping(subtotalAfterDiscount, s) {
  if (!truthy(s.shipping_enabled)) return 0;

  const fee = num(s.shipping_fee, 0);
  const th = num(s.free_shipping_threshold, 0);

  if (fee <= 0) return 0;
  if (th > 0 && subtotalAfterDiscount >= th) return 0;

  return fee;
}

/**
 * ctx 統一格式：
 * {
 *   coupon: { type, rate, amount } | null,
 *   firstPurchase: true/false,
 *   birthday: true/false
 * }
 */
export function calcDiscount(subtotal, s, ctx = {}) {
  // 🔒 優惠碼成功 → 其他折扣全部失效
  if (ctx.coupon) {
    if (ctx.coupon.type === "rate") {
      return Math.round(subtotal * (1 - num(ctx.coupon.rate, 1)));
    }
    if (ctx.coupon.type === "amount") {
      return Math.min(subtotal, num(ctx.coupon.amount, 0));
    }
    return 0;
  }

  // 沒優惠碼，才考慮首購 / 生日
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
  const afterDiscount = subtotal - discount;
  const shipping = calcShipping(afterDiscount, s);
  const total = afterDiscount + shipping;

  return { subtotal, discount, shipping, total };
}
