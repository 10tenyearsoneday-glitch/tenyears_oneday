// include-shop.js — TEN YEARS ONE DAY (NO MODULE, SAFE BOOT)

(() => {
  if (window.TEN_SHOP_LOADED) return;

  function waitForDeps() {
    const P = window.TEN_PRICING;
    const L = window.TEN_DISCOUNT_LABEL;

    if (!P || !P.calcTotal || !P.money || !L || !L.buildDiscountLabels) {
      return setTimeout(waitForDeps, 30);
    }

    // ✅ 依賴齊了，正式啟動
    window.TEN_SHOP_LOADED = true;

    const { calcTotal, money } = P;
    const { buildDiscountLabels } = L;

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
      $("cartBackdrop").hidden = false;
      $("cartDrawer").hidden = false;
      document.body.style.overflow = "hidden";
      renderDrawer();
    }

    function closeDrawer() {
      document.body.style.overflow = "";
      $("cartBackdrop").hidden = true;
      $("cartDrawer").hidden = true;
    }

    function bindCartIcon() {
      const a = document.querySelector('.icon-row a[data-icon="cart"]');
      if (!a) return;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openDrawer();
      });
    }

    function bindDrawerClose() {
      $("cartClose")?.addEventListener("click", closeDrawer);
      $("cartBackdrop")?.addEventListener("click", closeDrawer);
    }

    /* =========================
       Drawer render
    ========================= */
    async function renderDrawer() {
      const list = $("cartItems");
      if (!list) return;

      const cart = readCart();

      if (!cart.length) {
        list.innerHTML = `<div class="muted">購物車是空的</div>`;
        $("cartSubtotal").textContent = money(0);
        $("cartShipping").textContent = money(0);
        $("cartTotal").textContent = money(0);
        return;
      }

      list.innerHTML = cart.map(it => `
        <div class="d-item">
          <div class="d-info">
            <div class="d-name">${it.title}</div>
            <div class="d-meta">${money(it.price)}</div>
          </div>
        </div>
      `).join("");

      const settings = await getSettings();
      const ctx = {
        firstPurchase: isFirstPurchase(),
        birthday: isBirthday()
      };

      const pricing = calcTotal(cart, settings, ctx);

      $("cartSubtotal").textContent = money(pricing.subtotal);
      $("cartShipping").textContent =
        pricing.shipping === 0 ? "免運" : money(pricing.shipping);
      $("cartTotal").textContent = money(pricing.total);
    }

    /* =========================
       Init
    ========================= */
    window.addEventListener("cart:changed", renderDrawer);
    window.addEventListener("DOMContentLoaded", () => {
      bindCartIcon();
      bindDrawerClose();
      renderDrawer();
    });
  }

  // 🔑 啟動等待
  waitForDeps();
})();
