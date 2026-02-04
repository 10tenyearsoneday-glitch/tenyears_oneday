// pricing.js — TEN YEARS ONE DAY FINAL v2 (SAFE)

(function () {
  const GAS_PRODUCTS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const CART_KEY = "ten_cart";
  const TOKEN_KEY = "ten_token";

  let SETTINGS = null;

  const truthy = (v) =>
    v === true || v === 1 || v === "1" || String(v || "").toUpperCase() === "TRUE";

  const num = (v, d = null) => {
    const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : d;
  };

  const money = (n) => `NT$ ${Math.round(n || 0)}`;

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      return [];
    }
  }

  async function loadSettings() {
    if (SETTINGS) return SETTINGS;
    const r = await fetch(GAS_PRODUCTS_URL + "?path=settings");
    SETTINGS = await r.json();
    return SETTINGS;
  }

  async function isFirstPurchase(memberId) {
    if (!memberId) return false;
    try {
      const r = await fetch(
        GAS_PRODUCTS_URL + "?path=my_orders&member_id=" + memberId
      );
      const j = await r.json();
      return j.ok && (j.orders || []).length === 0;
    } catch {
      return false;
    }
  }

  async function calcPricing() {
    await loadSettings();

    const cart = getCart();
    let subtotal = 0;

    cart.forEach((i) => (subtotal += num(i.price, 0) * num(i.qty || 1, 1)));

    const shippingEnabled = truthy(SETTINGS.shipping_enabled);
    const shippingFee = num(SETTINGS.shipping_fee, 0);
    const freeThreshold = num(SETTINGS.free_shipping_threshold, null);

    let shipping = 0;

    if (shippingEnabled) {
      if (freeThreshold !== null && subtotal >= freeThreshold) shipping = 0;
      else shipping = shippingFee;
    }

    // ===== 首購 =====
    let discount = 0;
    let discountNote = "";

    const token = localStorage.getItem(TOKEN_KEY);
    let memberId = "";

    if (token) {
      try {
        const r = await fetch(GAS_PRODUCTS_URL + "?path=member_me&token=" + token);
        const j = await r.json();
        memberId = j.memberId || "";
      } catch {}
    }

    if (memberId && truthy(SETTINGS.first_purchase_enabled)) {
      const first = await isFirstPurchase(memberId);
      if (first) {
        const rate = num(SETTINGS.first_purchase_rate, 0);
        discount = Math.round(subtotal * rate / 100);
        discountNote = "首購折扣";
      }
    }

    const total = subtotal - discount + shipping;

    return { subtotal, shipping, discount, total, discountNote };
  }

  window.__TEN_PRICING__ = async function () {
    const p = await calcPricing();

    document.querySelectorAll("[data-subtotal]").forEach(
      (e) => (e.textContent = money(p.subtotal))
    );
    document.querySelectorAll("[data-shipping]").forEach(
      (e) => (e.textContent = p.shipping ? money(p.shipping) : "免運")
    );
    document.querySelectorAll("[data-discount]").forEach(
      (e) => (e.textContent = money(p.discount))
    );
    document.querySelectorAll("[data-total]").forEach(
      (e) => (e.textContent = money(p.total))
    );

    return p;
  };

  console.log("[TEN] pricing ready");

  document.addEventListener("DOMContentLoaded", () => {
    window.__TEN_PRICING__();
  });
})();
