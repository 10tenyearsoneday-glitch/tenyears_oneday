// include-shop.js — FINAL V2 (shipping + first purchase + birthday + coupon stack)
(() => {
  if (window.TEN_SHOP_V2) return;
  window.TEN_SHOP_V2 = true;

  /* ========================
     基本設定
  ======================== */
  const CART_KEY = "ten_cart";
  const MEMBER_KEY = "ten_member_id";
  const APPLIED_KEY = "ten_applied_coupon_v1";
  const HAS_PURCHASE_KEY = "ten_has_purchase_v1";
  const BIRTH_MONTH_KEY = "ten_member_birth_m"; // 1~12

  const GAS_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const $ = (id) => document.getElementById(id);
  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;

  /* ========================
     購物車
  ======================== */
  const readCart = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  /* ========================
     會員
  ======================== */
  const getMemberId = () => {
    let id = localStorage.getItem(MEMBER_KEY);
    if (!id) {
      id = "M-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      localStorage.setItem(MEMBER_KEY, id);
    }
    return id;
  };

  /* ========================
     Settings
  ======================== */
  async function fetchSettings() {
    if (window.TEN_SETTINGS) return window.TEN_SETTINGS;

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

    window.TEN_SETTINGS = {
      shipping_enabled: s.shipping_enabled === true || s.shipping_enabled === "true",
      shipping_fee: Number(s.shipping_fee || 0),
      free_shipping_threshold: Number(s.free_shipping_threshold || 0),
      first_purchase_discount: Number(s.first_purchase_discount || 1),
      birthday_discount: Number(s.birthday_discount || 1),
    };
    return window.TEN_SETTINGS;
  }

  /* ========================
     折扣計算
  ======================== */
  const calcFirstPurchase = (subtotal, s) => {
    if (localStorage.getItem(HAS_PURCHASE_KEY) === "1") return 0;
    const r = s.first_purchase_discount;
    if (!(r > 0 && r < 1)) return 0;
    return Math.round(subtotal * (1 - r));
  };

  const calcBirthday = (subtotal, s) => {
    const m = Number(localStorage.getItem(BIRTH_MONTH_KEY));
    const now = new Date().getMonth() + 1;
    if (!m || m !== now) return 0;
    const r = s.birthday_discount;
    if (!(r > 0 && r < 1)) return 0;
    return Math.round(subtotal * (1 - r));
  };

  const calcShipping = (subtotal, s) => {
    if (!s.shipping_enabled) return 0;
    if (s.free_shipping_threshold > 0 && subtotal >= s.free_shipping_threshold) return 0;
    return Math.max(0, s.shipping_fee);
  };

  /* ========================
     優惠碼
  ======================== */
  const readApplied = () => {
    try { return JSON.parse(localStorage.getItem(APPLIED_KEY) || "{}"); }
    catch { return {}; }
  };

  async function validateCoupon(code, subtotal) {
    const url =
      `${GAS_URL}?path=coupon_validate` +
      `&code=${encodeURIComponent(code)}` +
      `&memberId=${encodeURIComponent(getMemberId())}` +
      `&subtotal=${encodeURIComponent(subtotal)}`;

    const res = await fetch(url, { cache: "no-store" });
    return await res.json().catch(() => null);
  }

  /* ========================
     Drawer 計算與顯示
  ======================== */
  async function renderCart() {
    const cart = readCart();
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const s = await fetchSettings();
    const applied = readApplied();

    const dFirst = calcFirstPurchase(subtotal, s);
    const dBirth = calcBirthday(subtotal, s);
    const dCoupon = Math.min(subtotal, Number(applied.discount || 0));
    const shipping = calcShipping(subtotal, s);

    const total = Math.max(0, subtotal - dFirst - dBirth - dCoupon + shipping);

    $("cartSubtotal") && ($("cartSubtotal").textContent = money(subtotal));
    $("cartFirstDiscount") && ($("cartFirstDiscount").textContent = `- ${money(dFirst)}`);
    $("cartBirthdayDiscount") && ($("cartBirthdayDiscount").textContent = `- ${money(dBirth)}`);
    $("cartDiscount") && ($("cartDiscount").textContent = `- ${money(dCoupon)}`);
    $("cartShipping") && ($("cartShipping").textContent = money(shipping));
    $("cartTotal") && ($("cartTotal").textContent = money(total));
  }

  /* ========================
     優惠碼套用
  ======================== */
  $("drawerCouponApply")?.addEventListener("click", async () => {
    const code = $("drawerCouponCode")?.value.trim();
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

  /* ========================
     監聽
  ======================== */
  window.addEventListener("cart:changed", renderCart);
  renderCart();

})();
