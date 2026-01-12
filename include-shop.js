// include-shop.js — STABLE FIXED VERSION
(() => {
  // ===== 全站保險：已載入就不再跑 =====
  if (window.__TEN_SHOP_LOADED__) return;
  window.__TEN_SHOP_LOADED__ = true;

  // ===== HARD GUARD：沒有購物車 DOM，直接退出 =====
  // 只要不是購物車 / 結帳相關頁面，這支 JS 不會動任何東西
  if (!document.getElementById("cartTotal")) return;

  /* =========================
     基本設定
  ========================= */
  const CART_KEY = "ten_cart";
  const APPLIED_KEY = "ten_applied_coupon_v1";
  const HAS_PURCHASE_KEY = "ten_has_purchase_v1";

  const GAS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const $ = (id) => document.getElementById(id);
  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;

  /* =========================
     購物車資料
  ========================= */
  const readCart = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  /* =========================
     Settings（運費 / 首購）
  ========================= */
  async function fetchSettings() {
    if (window.__TEN_SETTINGS__) return window.__TEN_SETTINGS__;

    const res = await fetch(`${GAS_URL}?path=settings`, { cache: "no-store" });
    const raw = await res.json().catch(() => ({}));

    let s = raw;
    if (s && typeof s === "object" && "data" in s) s = s.data;
    if (Array.isArray(s)) {
      const o = {};
      for (const r of s) {
        const k = r.key ?? r.name ?? r[0];
        const v = r.value ?? r.val ?? r[1];
        if (k != null) o[String(k)] = v;
      }
      s = o;
    }
    if (!s || typeof s !== "object") s = {};

    window.__TEN_SETTINGS__ = {
      shipping_enabled: s.shipping_enabled === true || s.shipping_enabled === "true",
      shipping_fee: Number(s.shipping_fee || 0),
      free_shipping_threshold: Number(s.free_shipping_threshold || 0),
      first_purchase_discount: Number(s.first_purchase_discount || 1),
    };
    return window.__TEN_SETTINGS__;
  }

  const calcShipping = (subtotal, s) => {
    if (!s.shipping_enabled) return 0;
    if (s.free_shipping_threshold > 0 && subtotal >= s.free_shipping_threshold) return 0;
    return Math.max(0, s.shipping_fee);
  };

  const calcFirstPurchase = (subtotal, s) => {
    if (localStorage.getItem(HAS_PURCHASE_KEY) === "1") return 0;
    const r = s.first_purchase_discount;
    if (!(r > 0 && r < 1)) return 0;
    return Math.round(subtotal * (1 - r));
  };

  /* =========================
     優惠碼
  ========================= */
  const readApplied = () => {
    try {
      return JSON.parse(localStorage.getItem(APPLIED_KEY) || "{}");
    } catch {
      return {};
    }
  };

  async function validateCoupon(code, subtotal) {
    const url =
      `${GAS_URL}?path=coupon_validate` +
      `&code=${encodeURIComponent(code)}` +
      `&subtotal=${encodeURIComponent(subtotal)}`;

    const res = await fetch(url, { cache: "no-store" });
    return await res.json().catch(() => null);
  }

  /* =========================
     結算渲染（唯一會跑的地方）
  ========================= */
  async function renderCart() {
    const cart = readCart();
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);

    const settings = await fetchSettings();
    const applied = readApplied();

    const firstDiscount = calcFirstPurchase(subtotal, settings);
    const couponDiscount = Math.min(subtotal, Number(applied.discount || 0));
    const shipping = calcShipping(subtotal, settings);

    const total = Math.max(
      0,
      subtotal - firstDiscount - couponDiscount + shipping
    );

    $("cartSubtotal") && ($("cartSubtotal").textContent = money(subtotal));
    $("cartFirstDiscount") &&
      ($("cartFirstDiscount").textContent = `- ${money(firstDiscount)}`);
    $("cartDiscount") &&
      ($("cartDiscount").textContent = `- ${money(couponDiscount)}`);
    $("cartShipping") && ($("cartShipping").textContent = money(shipping));
    $("cartTotal") && ($("cartTotal").textContent = money(total));
  }

  /* =========================
     套用優惠碼
  ========================= */
  $("drawerCouponApply")?.addEventListener("click", async () => {
    const code = $("drawerCouponCode")?.value.trim();
    if (!code) return;

    const cart = readCart();
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);

    const out = await validateCoupon(code, subtotal);
    if (!out || out.error) {
      alert("優惠碼無法使用");
      return;
    }
    localStorage.setItem(APPLIED_KEY, JSON.stringify(out));
    renderCart();
  });

  /* =========================
     啟動
  ========================= */
  window.addEventListener("cart:changed", renderCart);
  renderCart();

})();
