// include-shop.js (FINAL - with shipping + first purchase + coupon stack)
(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;

  // ===== guard: 不在後台跑 =====
  const __p = (location.pathname.split('/').pop() || '').toLowerCase();
  if (__p.includes('admin') || __p.includes('backend') || __p.includes('manage')) {
    window.TEN_SHOP_LOADED = false;
    return;
  }

  // ===== config =====
  const CART_KEY = "ten_cart";
  const MEMBER_KEY = "ten_member_id";
  const APPLIED_KEY = "ten_applied_coupon_v1";
  const HAS_PURCHASE_KEY = "ten_has_purchase_v1";

  window.TEN_CONFIG = window.TEN_CONFIG || {
    products_gas_url: "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec"
  };
  const GAS_PRODUCTS_URL = window.TEN_CONFIG.products_gas_url;

  // ===== helpers =====
  const $ = (id) => document.getElementById(id);

  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;

  const normalizeQty = (n) => {
    n = Number(n || 1);
    return (!Number.isFinite(n) || n < 1) ? 1 : Math.floor(n);
  };

  const getMemberId = () => {
    let id = localStorage.getItem(MEMBER_KEY);
    if (!id) {
      id = "M-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      localStorage.setItem(MEMBER_KEY, id);
    }
    return id;
  };

  // ===== cart storage =====
  const readCart = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const writeCart = (items) => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart:changed"));
  };

  // ===== settings =====
  async function fetchSettings() {
    if (window.TEN_SETTINGS) return window.TEN_SETTINGS;

    const res = await fetch(`${GAS_PRODUCTS_URL}?path=settings`, { cache: "no-store" });
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
    };
    return window.TEN_SETTINGS;
  }

  const calcShipping = (subtotal, s) => {
    if (!s.shipping_enabled) return 0;
    if (s.free_shipping_threshold > 0 && subtotal >= s.free_shipping_threshold) return 0;
    return Math.max(0, s.shipping_fee);
  };

  const calcFirstPurchaseDiscount = (subtotal, s) => {
    if (localStorage.getItem(HAS_PURCHASE_KEY) === "1") return 0;
    const rate = Number(s.first_purchase_discount || 1);
    if (!(rate > 0 && rate < 1)) return 0;
    return Math.round(subtotal * (1 - rate));
  };

  // ===== coupon =====
  const readApplied = () => {
    try {
      return JSON.parse(localStorage.getItem(APPLIED_KEY) || "{}");
    } catch {
      return {};
    }
  };
  const writeApplied = (o) => localStorage.setItem(APPLIED_KEY, JSON.stringify(o || {}));

  async function validateCoupon(code, subtotal) {
    const url =
      `${GAS_PRODUCTS_URL}?path=coupon_validate` +
      `&code=${encodeURIComponent(code)}` +
      `&memberId=${encodeURIComponent(getMemberId())}` +
      `&subtotal=${encodeURIComponent(subtotal)}`;

    const res = await fetch(url, { cache: "no-store" });
    return await res.json().catch(() => null);
  }

  // ===== drawer render =====
  function renderDrawer() {
    const itemsEl = $("cartItems");
    if (!itemsEl) return;

    const cart = readCart().map(it => ({
      id: String(it.id),
      title: String(it.title),
      price: Number(it.price),
      qty: normalizeQty(it.qty),
      image: it.image || ""
    }));

    itemsEl.innerHTML = cart.length
      ? cart.map(it => `
        <div class="d-item">
          <div class="d-name">${it.title}</div>
          <div class="d-price">${money(it.price * it.qty)}</div>
        </div>`).join("")
      : `<div class="muted">購物車是空的</div>`;

    (async () => {
      const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
      const applied = readApplied();
      const settings = await fetchSettings();

      const shipping = calcShipping(subtotal, settings);
      const firstDiscount = calcFirstPurchaseDiscount(subtotal, settings);
      const couponDiscount = Math.min(subtotal, Number(applied.discount || 0));

      const total = Math.max(0, subtotal + shipping - firstDiscount - couponDiscount);

      $("cartSubtotal") && ($("cartSubtotal").textContent = money(subtotal));
      $("cartShipping") && ($("cartShipping").textContent = money(shipping));
      $("cartActivityDiscount") && ($("cartActivityDiscount").textContent = `- ${money(firstDiscount)}`);
      $("cartDiscount") && ($("cartDiscount").textContent = `- ${money(couponDiscount)}`);
      $("cartTotal") && ($("cartTotal").textContent = money(total));
    })();
  }

  // ===== coupon apply =====
  $("drawerCouponApply")?.addEventListener("click", async () => {
    const code = $("drawerCouponCode")?.value.trim();
    const cart = readCart();
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);

    const out = await validateCoupon(code, subtotal);
    if (!out || out.error) {
      alert("優惠碼無法使用");
      return;
    }
    writeApplied(out);
    renderDrawer();
  });

  // ===== cart events =====
  window.addEventListener("cart:changed", renderDrawer);
  renderDrawer();

})();
