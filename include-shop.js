// include-shop.js — TEN YEARS ONE DAY (STABLE FINAL)

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
     Pricing / Label（安全吃）
  ========================= */
  const PRICING = window.TEN_PRICING || {};
  const LABELS = window.TEN_DISCOUNT_LABEL || {};

  const calcTotal = PRICING.calcTotal || function (items) {
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    return { subtotal, discount: 0, shipping: 0, total: subtotal };
  };

  const money = PRICING.money || (n => `NT$ ${Math.round(Number(n || 0))}`);
  const buildDiscountLabels =
    LABELS.buildDiscountLabels || (() => []);

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

  const cartCount = () =>
    readCart().reduce((s, it) => s + Number(it.qty || 1), 0);

  /* =========================
     ✅ PUBLIC API（關鍵）
  ========================= */
  window.TEN = window.TEN || {};

  window.TEN.addToCart = function (product, qty = 1) {
    if (!product || !product.id) {
      console.error("[TEN] addToCart: invalid product", product);
      return false;
    }

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
    return true;
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
      })
      .catch(err => console.error("[TEN] header load failed", err));
  }

  function renderCartBadge() {
    const el = $("cartCount");
    if (!el) return;
    const n = cartCount();
    el.textContent = n > 0 ? String(n) : "";
    el.style.display = n > 0 ? "inline-flex" : "none";
  }

  /* =========================
     Drawer open / close
  ========================= */
  function openDrawer() {
    $("cartBackdrop") && ($("cartBackdrop").hidden = false);
    $("cartDrawer") && ($("cartDrawer").hidden = false);
    document.body.style.overflow = "hidden";
    renderDrawer();
  }

  function closeDrawer() {
    document.body.style.overflow = "";
    $("cartBackdrop") && ($("cartBackdrop").hidden = true);
    $("cartDrawer") && ($("cartDrawer").hidden = true);
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
  coupon: null // 先不管優惠碼也可以
});

    $("cartSubtotal").textContent = money(pricing.subtotal);
    $("cartShipping").textContent =
      pricing.shipping === 0 ? "免運" : money(pricing.shipping);
    $("cartTotal").textContent = money(pricing.total);

    const promo = $("cartPromoTips");
    if (promo) {
      const labels = buildDiscountLabels({}, {});
      promo.innerHTML = labels.map(t => `<span>${t}</span>`).join("");
    }
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
})();
