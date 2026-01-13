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
    __TEN_SETTINGS =
      out && typeof out === "object"
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
 * ctx:
 * {
 *   firstPurchase: true/false,
 *   birthday: true/false,
 *   coupon: { type: "rate"|"amount", rate?, amount? } | null
 * }
 */
export function calcDiscount(subtotal, s, ctx = {}) {
  let discount = 0;

  /* === 第一層：首購 / 生日（責一，取折數較大） === */
  let baseRate = 1;

  const rates = [];
  if (ctx.firstPurchase && s.first_purchase_discount)
    rates.push(num(s.first_purchase_discount, 1));
  if (ctx.birthday && s.birthday_discount)
    rates.push(num(s.birthday_discount, 1));

  if (rates.length > 0) {
    baseRate = Math.min(...rates); // 折數越小，折越多
    const baseDiscount = Math.round(subtotal * (1 - baseRate));
    discount += baseDiscount;
  }

  const afterBase = subtotal - discount;

  /* === 第二層：優惠碼（可疊加） === */
  if (ctx.coupon && afterBase > 0) {
    if (ctx.coupon.type === "rate") {
      discount += Math.round(afterBase * (1 - num(ctx.coupon.rate, 1)));
    } else if (ctx.coupon.type === "amount") {
      discount += Math.min(afterBase, num(ctx.coupon.amount, 0));
    }
  }

  return discount;
}

export function calcTotal(items, s, ctx = {}) {
  const subtotal = calcSubtotal(items);
  const discount = calcDiscount(subtotal, s, ctx);
  const afterDiscount = subtotal - discount;
  const shipping = calcShipping(afterDiscount, s);
  const total = afterDiscount + shipping;

  return { subtotal, discount, shipping, total };
}
/**
 * 回傳 UI 用的折扣標籤
 */
export function getDiscountLabels(s, ctx = {}) {
  const labels = [];

  // 首購 / 生日（責一）
  const rateMap = [];

  if (ctx.firstPurchase && s.first_purchase_discount) {
    rateMap.push({
      label: "首購優惠",
      rate: num(s.first_purchase_discount, 1)
    });
  }

  if (ctx.birthday && s.birthday_discount) {
    rateMap.push({
      label: "生日優惠",
      rate: num(s.birthday_discount, 1)
    });
  }

  if (rateMap.length > 0) {
    const best = rateMap.sort((a, b) => a.rate - b.rate)[0];
    labels.push(`${best.label} ${Math.round(best.rate * 100)} 折`);
  }

  // 優惠碼（可疊）
  if (ctx.coupon) {
    labels.push(`優惠碼 ${ctx.coupon.code}`);
  }

  return labels;
}
