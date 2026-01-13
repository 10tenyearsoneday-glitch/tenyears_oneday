// include-shop.js — TEN YEARS ONE DAY (DRAWER USES PRICING)

const { calcTotal, money } = window.TEN_PRICING;
const { buildDiscountLabels } = window.TEN_DISCOUNT_LABEL;


(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;

  /* =========================
     基本設定
  ========================= */
  const CART_KEY = "ten_cart";
  const COUPON_KEY = "ten_applied_coupon_v1";
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const $ = (id) => document.getElementById(id);

  /* =========================
     Cart storage
  ========================= */
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

  /* =========================
     Member state
  ========================= */
  const isFirstPurchase = () => !localStorage.getItem("ten_has_purchase_v1");

  const isBirthday = () => {
    const m = localStorage.getItem("ten_birth_m");
    const d = localStorage.getItem("ten_birth_d");
    if (!m || !d) return false;
    const now = new Date();
    return now.getMonth() + 1 === Number(m) && now.getDate() === Number(d);
  };

  /* =========================
     Settings
  ========================= */
  let SETTINGS = null;
  async function getSettings() {
    if (SETTINGS) return SETTINGS;
    const res = await fetch(`${GAS_URL}?path=settings`, { cache: "no-store" });
    const out = await res.json();
    SETTINGS = out.ok && out.data ? out.data : out;
    return SETTINGS;
  }

  /* =========================
     Coupon
  ========================= */
  async function validateCoupon(code, subtotal) {
    const res = await fetch(
      `${GAS_URL}?path=coupon_validate&code=${encodeURIComponent(code)}&subtotal=${subtotal}`,
      { cache: "no-store" }
    );
    const out = await res.json();
    return out.ok ? out.data : null;
  }

  /* =========================
     Drawer open / close
  ========================= */
  function openDrawer() {
    $("cartBackdrop") && ($("cartBackdrop").hidden = false);
    $("cartDrawer") && ($("cartDrawer").hidden = false);
    $("cartBackdrop")?.classList.add("open");
    $("cartDrawer")?.classList.add("open");
    document.body.style.overflow = "hidden";
    renderDrawer();
  }

  function closeDrawer() {
    $("cartBackdrop")?.classList.remove("open");
    $("cartDrawer")?.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => {
      $("cartBackdrop") && ($("cartBackdrop").hidden = true);
      $("cartDrawer") && ($("cartDrawer").hidden = true);
    }, 180);
  }

  function bindCartIcon() {
    const a = document.querySelector('.icon-row a[data-icon="cart"]');
    a && a.addEventListener("click", (e) => {
      e.preventDefault();
      openDrawer();
    });
  }

  function bindDrawerClose() {
    $("cartClose")?.addEventListener("click", closeDrawer);
    $("cartBackdrop")?.addEventListener("click", closeDrawer);
  }

  /* =========================
     Drawer render（核心）
  ========================= */
  async function renderDrawer() {
    const list = $("cartItems");
    if (!list) return;

    const cart = readCart();

    if (!cart.length) {
      list.innerHTML = `<div class="muted">購物車是空的</div>`;
      $("cartSubtotal").textContent = money(0);
      $("cartDiscount").textContent = money(0);
      $("cartShipping").textContent = money(0);
      $("cartTotal").textContent = money(0);
      $("cartDiscountLabel").textContent = "";
      return;
    }

    list.innerHTML = cart.map(it => `
      <div class="d-item">
        <div class="d-thumb"><img src="${it.image || ""}"></div>
        <div class="d-info">
          <div class="d-name">${it.title}</div>
          <div class="d-meta">${money(it.price)}</div>
        </div>
        <div class="d-qty">
          <button data-dec="${it.id}">-</button>
          <input type="number" min="1" value="${it.qty}" data-qty="${it.id}">
          <button data-inc="${it.id}">+</button>
        </div>
        <button class="d-del" data-del="${it.id}">移除</button>
      </div>
    `).join("");

    const settings = await getSettings();
    const subtotal = cart.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0);

    const couponCode = localStorage.getItem(COUPON_KEY);
    const coupon = couponCode
      ? await validateCoupon(couponCode, subtotal)
      : null;

    const ctx = {
      firstPurchase: isFirstPurchase(),
      birthday: isBirthday(),
      coupon: coupon ? { ...coupon, code: couponCode } : null
    };

    const pricing = calcTotal(cart, settings, ctx);
    const labels = buildDiscountLabels(settings, ctx);

    $("cartSubtotal").textContent = money(pricing.subtotal);
    $("cartDiscount").textContent =
      pricing.discount > 0 ? `- ${money(pricing.discount)}` : money(0);
    $("cartShipping").textContent =
      pricing.shipping === 0 ? "免運" : money(pricing.shipping);
    $("cartTotal").textContent = money(pricing.total);
    $("cartDiscountLabel").textContent = labels.join(" ＋ ");
  }

  /* =========================
     Drawer events
  ========================= */
  document.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const del = e.target.closest("[data-del]");
    let cart = readCart();

    if (inc) {
      const i = cart.find(x => x.id === inc.dataset.inc);
      if (i) i.qty++;
    }
    if (dec) {
      const i = cart.find(x => x.id === dec.dataset.dec);
      if (i) i.qty = Math.max(1, i.qty - 1);
    }
    if (del) {
      cart = cart.filter(x => x.id !== del.dataset.del);
    }

    if (inc || dec || del) {
      writeCart(cart);
      renderDrawer();
    }
  });

  document.addEventListener("change", (e) => {
    const inp = e.target.closest("[data-qty]");
    if (!inp) return;
    const cart = readCart();
    const i = cart.find(x => x.id === inp.dataset.qty);
    if (i) i.qty = Math.max(1, Math.floor(inp.value));
    writeCart(cart);
    renderDrawer();
  });

  /* =========================
     Init
  ========================= */
  window.addEventListener("cart:changed", renderDrawer);
  window.addEventListener("DOMContentLoaded", () => {
    bindCartIcon();
    bindDrawerClose();
    renderDrawer();
  });
})();
