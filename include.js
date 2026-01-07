// include.js（FINAL / LOCKED VERSION）
// ⚠️ 本檔已定版：
// - 不再改購物車
// - 不再改優惠碼
// - 不再改結帳
// - 會員相關請在 member*.html 處理

(() => {
  if (window.TEN_INCLUDE_LOADED) return;
  window.TEN_INCLUDE_LOADED = true;

  /* =====================
     基本設定（保持你原本）
  ===================== */
  window.API_BASE = window.API_BASE || "https://tenyears-oneday-api.onrender.com";
  const CART_KEY = "ten_cart";
  const MEMBER_KEY = "ten_member_id";

  const GAS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const ADMIN_KEY = "10years1day911321";

  window.TEN_SETTINGS = window.TEN_SETTINGS || {
    shipping_enabled: true,
    shipping_fee: 60,
    free_shipping_threshold: 1000,
    first_purchase_discount: 0.9,
    birthday_discount: 0.85,
  };

  window.TEN_APPLIED = window.TEN_APPLIED || { code: "", discount: 0, note: "" };
  window.TEN = window.TEN || {};

  /* =====================
     小工具
  ===================== */
  const $ = (id) => document.getElementById(id);
  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;
  const normalizeQty = (n) => Math.max(1, Math.floor(Number(n || 1)));

  function getMemberId() {
    let id = localStorage.getItem(MEMBER_KEY);
    if (!id) {
      id = "M-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      localStorage.setItem(MEMBER_KEY, id);
    }
    return id;
  }

  function readCart() {
    try {
      const arr = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart:changed"));
  }

  function cartCount() {
    return readCart().reduce((s, it) => s + normalizeQty(it.qty), 0);
  }

  /* =====================
     addToCart（保持原邏輯）
  ===================== */
  window.TEN.addToCart = function (product, qty = 1) {
    const pid = String(product?.id || "").trim();
    if (!pid) return;

    const cart = readCart();
    const i = cart.findIndex((x) => String(x.id) === pid);

    if (i === -1) {
      cart.push({
        id: pid,
        qty: normalizeQty(qty),
        title: product?.title,
        price: product?.price,
        image: product?.image,
      });
    } else {
      cart[i].qty += normalizeQty(qty);
    }

    writeCart(cart);
  };

  /* =====================
     Header 載入（⚠️ 這段不能亂動）
  ===================== */
  async function loadHeader() {
    if (document.documentElement.dataset.headerLoaded === "1") return;
    document.documentElement.dataset.headerLoaded = "1";

    const res = await fetch("./header.html", { cache: "no-store" });
    const html = await res.text();
    document.body.insertAdjacentHTML("afterbegin", html);

    bindCartIcon();
    renderCartBadge();
  }

  function bindCartIcon() {
    const cartBtn = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!cartBtn) return;

    cartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openDrawer();
    });
  }

  function renderCartBadge() {
    const el = $("cartCount");
    if (!el) return;
    const n = cartCount();
    el.textContent = n;
    el.hidden = n <= 0;
  }

  /* =====================
     Drawer（保持原結構）
  ===================== */
  function openDrawer() {
    $("cartBackdrop")?.classList.add("open");
    $("cartDrawer")?.classList.add("open");
    document.body.style.overflow = "hidden";
    renderDrawer();
  }

  function closeDrawer() {
    $("cartBackdrop")?.classList.remove("open");
    $("cartDrawer")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  function renderDrawer() {
    const cart = readCart();
    const itemsEl = $("cartItems");
    if (!itemsEl) return;

    if (!cart.length) {
      itemsEl.innerHTML = `<div class="muted">購物車是空的。</div>`;
      return;
    }

    itemsEl.innerHTML = cart
      .map(
        (it) => `
      <div class="d-item">
        <div>${it.title}</div>
        <div>${money(it.price)} × ${it.qty}</div>
      </div>
    `
      )
      .join("");
  }

  /* =====================
     初始化（只做一次）
  ===================== */
  window.addEventListener("DOMContentLoaded", () => {
    loadHeader();
    renderCartBadge();

    window.addEventListener("cart:changed", renderCartBadge);
  });
})();
