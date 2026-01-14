// include-shop.js — TEN YEARS ONE DAY (FINAL, NO MODULE, SAFE)

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
  const moneyFallback = (n) => `NT$ ${Math.round(Number(n || 0))}`;

  /* =========================
     Cart storage
  ========================= */
  const readCart = () => {
    try {
      const a = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  };

  const writeCart = (items) => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart:changed"));
  };

  const cartCount = () =>
    readCart().reduce((s, it) => s + Math.max(1, Number(it.qty || 1)), 0);

  /* =========================
     ✅ Public API（商品加入一定要有）
  ========================= */
  window.TEN = window.TEN || {};

  window.TEN.addToCart = function (product, qty = 1) {
    if (!product || !product.id) {
      console.error("[TEN] addToCart invalid product", product);
      return false;
    }

    const cart = readCart();
    const pid = String(product.id);
    const i = cart.findIndex((x) => x.id === pid);

    if (i === -1) {
      cart.push({
        id: pid,
        title: product.title || "",
        price: Number(product.price || 0),
        image: product.image || "",
        qty: Math.max(1, Number(qty || 1)),
      });
    } else {
      cart[i].qty += Math.max(1, Number(qty || 1));
    }

    writeCart(cart);
    return true;
  };

  /* =========================
     Header badge
  ========================= */
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
    a &&
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
     Drawer render（穩定版）
  ========================= */
  async function renderDrawer() {
    const list = $("cartItems");
    if (!list) return;

    const cart = readCart();

    if (!cart.length) {
      list.innerHTML = `<div class="muted">購物車是空的</div>`;
      $("cartSubtotal").textContent = moneyFallback(0);
      $("cartShipping").textContent = moneyFallback(0);
      $("cartTotal").textContent = moneyFallback(0);
      return;
    }

    list.innerHTML = cart
      .map(
        (it) => `
      <div class="d-item">
        <div class="d-thumb"><img src="${it.image || ""}"></div>
        <div class="d-info">
          <div class="d-name">${it.title}</div>
          <div class="d-meta">${moneyFallback(it.price)}</div>
        </div>
        <div class="d-qty">
          <button data-dec="${it.id}">-</button>
          <input type="number" min="1" value="${it.qty}" data-qty="${it.id}">
          <button data-inc="${it.id}">+</button>
        </div>
        <button class="d-del" data-del="${it.id}">移除</button>
      </div>
    `
      )
      .join("");

    /* ===== 計價（安全切換） ===== */
    const P = window.TEN_PRICING;
    const L = window.TEN_DISCOUNT_LABEL;

    let subtotal = cart.reduce(
      (s, it) => s + Number(it.price || 0) * Number(it.qty || 1),
      0
    );

    let pricing = {
      subtotal,
      discount: 0,
      shipping: 0,
      total: subtotal,
      discountLabel: "",
    };

    if (P && P.calcTotal) {
      const settings = await fetch(`${GAS_URL}?path=settings`)
        .then((r) => r.json())
        .catch(() => ({}));
      pricing = P.calcTotal(cart, settings, {});
    }

    $("cartSubtotal").textContent = (P?.money || moneyFallback)(
      pricing.subtotal
    );
    $("cartShipping").textContent =
      pricing.shipping === 0
        ? "免運"
        : (P?.money || moneyFallback)(pricing.shipping);
    $("cartTotal").textContent = (P?.money || moneyFallback)(pricing.total);
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
      const i = cart.find((x) => x.id === inc.dataset.inc);
      if (i) i.qty++;
    }
    if (dec) {
      const i = cart.find((x) => x.id === dec.dataset.dec);
      if (i) i.qty = Math.max(1, i.qty - 1);
    }
    if (del) cart = cart.filter((x) => x.id !== del.dataset.del);

    if (inc || dec || del) {
      writeCart(cart);
      renderDrawer();
    }
  });

  document.addEventListener("change", (e) => {
    const inp = e.target.closest("[data-qty]");
    if (!inp) return;
    const cart = readCart();
    const i = cart.find((x) => x.id === inp.dataset.qty);
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

  window.addEventListener("DOMContentLoaded", () => {
    bindCartIcon();
    bindDrawerClose();
    renderCartBadge();
    renderDrawer();
  });
})();
