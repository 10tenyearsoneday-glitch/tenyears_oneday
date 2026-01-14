// include-shop.js — TEN YEARS ONE DAY (FINAL STABLE, NO MODULE)

(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;

  /* =========================
     基本設定
  ========================= */
  const CART_KEY = "ten_cart";
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const $ = (id) => document.getElementById(id);
  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;

  /* =========================
     Settings
  ========================= */
  let __SETTINGS = null;
  async function getSettings() {
    if (__SETTINGS) return __SETTINGS;
    const res = await fetch(`${GAS_URL}?path=settings`, { cache: "no-store" });
    const out = await res.json();
    __SETTINGS = out.ok && out.data ? out.data : out;
    return __SETTINGS;
  }

  /* =========================
     Member state（先用 localStorage）
  ========================= */
  function isFirstPurchase() {
    return !localStorage.getItem("ten_has_purchase_v1");
  }

  function isBirthday() {
    const m = localStorage.getItem("ten_birth_m");
    const d = localStorage.getItem("ten_birth_d");
    if (!m || !d) return false;
    const now = new Date();
    return now.getMonth() + 1 === Number(m) && now.getDate() === Number(d);
  }

  /* =========================
     Pricing bridge（安全）
  ========================= */
  const PRICING = window.TEN_PRICING || {};
  const LABELS = window.TEN_DISCOUNT_LABEL || {};

  const calcTotal =
    PRICING.calcTotal ||
    function (items) {
      const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
      return { subtotal, discount: 0, shipping: 0, total: subtotal };
    };

  const buildDiscountLabels =
    LABELS.buildDiscountLabels || (() => []);

  /* =========================
     Cart storage
  ========================= */
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
    return readCart().reduce((s, it) => s + Number(it.qty || 1), 0);
  }

  /* =========================
     PUBLIC API（不要再消失）
  ========================= */
  window.TEN = window.TEN || {};

  window.TEN.addToCart = function (product, qty = 1) {
    if (!product || !product.id) return;

    const cart = readCart();
    const id = String(product.id);
    const i = cart.findIndex(x => x.id === id);

    if (i === -1) {
      cart.push({
        id,
        title: product.title || "",
        price: Number(product.price || 0),
        image: product.image || "",
        qty: Math.max(1, Number(qty || 1))
      });
    } else {
      cart[i].qty += Math.max(1, Number(qty || 1));
    }

    writeCart(cart);
    openDrawer();
  };

  /* =========================
     Header 注入
  ========================= */
  function loadHeader() {
    if (document.body.dataset.headerLoaded) return;
    document.body.dataset.headerLoaded = "1";

    fetch("./header.html", { cache: "no-store" })
      .then(res => res.text())
      .then(html => {
        document.body.insertAdjacentHTML("afterbegin", html);
        bindCartIcon();
        bindDrawerClose();
        renderCartBadge();
        renderDrawer();
      });
  }

  function renderCartBadge() {
    const el = $("cartCount");
    if (!el) return;
    const n = cartCount();
    el.textContent = n > 0 ? String(n) : "";
    el.style.display = n > 0 ? "inline-flex" : "none";
  }

  /* =========================
     Drawer open / close（關鍵）
  ========================= */
  function openDrawer() {
    const bd = $("cartBackdrop");
    const dr = $("cartDrawer");
    if (!bd || !dr) return;

    bd.hidden = false;
    dr.hidden = false;
    bd.classList.add("open");
    dr.classList.add("open");

    document.body.style.overflow = "hidden";
    renderDrawer();
  }

  function closeDrawer() {
    const bd = $("cartBackdrop");
    const dr = $("cartDrawer");
    if (!bd || !dr) return;

    bd.classList.remove("open");
    dr.classList.remove("open");
    document.body.style.overflow = "";

    setTimeout(() => {
      bd.hidden = true;
      dr.hidden = true;
    }, 180);
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
    const pricing = calcTotal(cart, settings, {
      firstPurchase: isFirstPurchase(),
      birthday: isBirthday(),
      coupon: null
    });

    $("cartSubtotal").textContent = money(pricing.subtotal);
    $("cartShipping").textContent =
      pricing.shipping === 0 ? "免運" : money(pricing.shipping);
    $("cartTotal").textContent = money(pricing.total);
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
  window.addEventListener("cart:changed", () => {
    renderCartBadge();
    renderDrawer();
  });

  window.addEventListener("DOMContentLoaded", loadHeader);
    /* =========================
     Drawer actions（補回）
  ========================= */

  function bindDrawerActions() {
    // 清空購物車
    const btnClear = $("cartClear");
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        if (!confirm("確定要清空購物車？")) return;
        writeCart([]);
        renderDrawer();
      });
    }

    // 前往結帳
    const btnCheckout = $("cartGoCheckout");
    if (btnCheckout) {
      btnCheckout.addEventListener("click", () => {
        // 你現在的流程是 modal / checkout.html
        // 這裡我只做最保守、不炸的版本
        window.location.href = "checkout.html";
      });
    }
  }

  /* =========================
     補到 header 注入完成後
  ========================= */
  const _oldLoadHeader = loadHeader;
  loadHeader = function () {
    _oldLoadHeader();
    setTimeout(bindDrawerActions, 0);
  };

})();
