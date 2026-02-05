// pricing.js — TEN YEARS ONE DAY (GLOBAL VERSION)

(function () {
  const GAS_PRODUCTS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  let SETTINGS = null;
  let LOADING = false;

  const truthy = (v) =>
    v === true ||
    v === 1 ||
    v === "1" ||
    String(v || "").toUpperCase() === "TRUE";

  const num = (v, d = 0) => {
    const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : d;
  };

  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;

  async function getSettings() {
    if (SETTINGS || LOADING) return SETTINGS || {};
    LOADING = true;
    try {
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=settings`, {
        cache: "no-store",
      });
      const out = await res.json();
      SETTINGS = out.ok && out.data ? out.data : out;
    } catch {
      SETTINGS = {};
    } finally {
      LOADING = false;
    }
    return SETTINGS;
  }

  function calcSubtotal(items) {
    return items.reduce((s, it) => s + num(it.price) * num(it.qty), 0);
  }
function calcShipping(subtotal, s) {
  if (!s || s.shipping_enabled !== "true") return 0;

  const fee = Number(s.shipping_fee || 0);
  const th = Number(s.free_shipping_threshold || 0);

  if (fee <= 0) return 0;

  // 只看滿額，不看會員
  if (th > 0 && subtotal >= th) return 0;

  return fee;
}
function calcDiscount(subtotal, s, ctx = {}) {

  let bestRate = 1;
  let labels = [];
  let amountOff = 0;

  // 首購
  if (ctx.firstPurchase && s.first_purchase_discount) {
    const r = num(s.first_purchase_discount, 1);
    if (r < bestRate) bestRate = r;
    labels.push("首購優惠");
  }

  // 生日
  if (ctx.birthday && s.birthday_discount) {
    const r = num(s.birthday_discount, 1);
    if (r < bestRate) bestRate = r;
    labels.push("生日優惠");
  }

  // 優惠碼
  if (ctx.coupon) {

    // 固定金額
    if (ctx.coupon.type === "amount") {
      amountOff += Number(ctx.coupon.amount || 0);
      labels.push(ctx.coupon.title || "優惠碼");
    }

    // 折數
    if (ctx.coupon.type !== "amount") {
      const r = num(ctx.coupon.rate, 1);
      if (r < bestRate) bestRate = r;
      labels.push(ctx.coupon.title || "優惠碼");
    }
  }

  // 先算比例折
  let discount = Math.round(subtotal * (1 - bestRate));

  // 再扣固定金額
  discount += amountOff;

  // 不可超過小計
  discount = Math.min(discount, subtotal);

  return {
    discount,
    label: labels.join("＋")
  };
}
function calcTotal(items, s, ctx = {}) {

  const subtotal = calcSubtotal(items);   // 原始小計

  const d = calcDiscount(subtotal, s, ctx);

  // ===== 運費只看原始小計 =====
  const fee  = Number(s.shipping_fee || 0);
  const free = Number(s.free_shipping_threshold || 0);

  let shipping = 0;

  if (fee > 0) {
    shipping = fee;
    if (free > 0 && subtotal >= free) {
      shipping = 0;
    }
  }

  const total = subtotal - d.discount + shipping;

  return {
    subtotal,
    discount: d.discount,
    discountLabel: d.label,
    shipping,
    total,
  };
}

  // 🌍 expose to window
  window.TEN_PRICING = {
    getSettings,
    calcTotal,
    money,
    truthy,
    num,
  };
})();
