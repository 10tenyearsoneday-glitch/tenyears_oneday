// include-shop.js (FIXED)
// - Keeps right-side cart drawer
// - Drawer item image size fixed (no giant images)
// - "Checkout" button redirects to cart.html (no modal / no order_create yet)

(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;

  // ===== Config =====
  const CART_KEY = "ten_cart";
  const MEMBER_KEY = "ten_member_id";

  window.TEN_CONFIG = window.TEN_CONFIG || {
    products_gas_url: "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec",
    members_gas_url: "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec"
  };

  // Expose namespace
  window.TEN = window.TEN || {};

  // ===== Utils =====
  function $(id) { return document.getElementById(id); }

  function normalizeQty(n) {
    n = Number(n || 1);
    if (!Number.isFinite(n) || n < 1) n = 1;
    return Math.floor(n);
  }

  function money(n) {
    n = Math.round(Number(n || 0));
    return `NT$ ${n}`;
  }

  function getMemberId() {
    let id = localStorage.getItem(MEMBER_KEY);
    if (!id) {
      id = "M-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      localStorage.setItem(MEMBER_KEY, id);
    }
    return id;
  }

  // ===== Cart storage =====
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
    return readCart().reduce((s, i) => s + normalizeQty(i.qty), 0);
  }

  function addToCart(product, qty = 1) {
    const cart = readCart();
    const pid = String(product?.id ?? "").trim();
    if (!pid) return;

    const i = cart.findIndex((x) => String(x.id) === pid);
    const q = normalizeQty(qty);

    if (i === -1) {
      cart.push({
        id: pid,
        title: product?.title || "",
        price: Number(product?.price || 0),
        image: product?.image || "assets/placeholder.png",
        qty: q
      });
    } else {
      cart[i].qty = normalizeQty(Number(cart[i].qty || 1) + q);
      if (!cart[i].title && product?.title) cart[i].title = product.title;
      if ((cart[i].price == null || cart[i].price === 0) && product?.price != null) cart[i].price = Number(product.price);
      if (!cart[i].image && product?.image) cart[i].image = product.image;
    }

    writeCart(cart);
  }

  window.TEN.addToCart = addToCart;
  window.TEN.readCart = readCart;
  window.TEN.writeCart = writeCart;
  window.TEN.getMemberId = getMemberId;

  // ===== Inject drawer CSS safety (fix giant images) =====
  function injectDrawerCss() {
    if (document.getElementById("ten-drawer-css")) return;
    const style = document.createElement("style");
    style.id = "ten-drawer-css";
    style.textContent = `
      #cartDrawer .d-item{display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06);}
      #cartDrawer .d-thumb{width:56px;height:56px;border-radius:12px;overflow:hidden;background:rgba(0,0,0,.04);flex:none}
      #cartDrawer .d-thumb img{width:100%;height:100%;object-fit:cover;display:block}
      #cartDrawer .d-info{min-width:0}
      #cartDrawer .d-name{font-weight:700;font-size:.95rem;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #cartDrawer .d-meta{font-size:.85rem;opacity:.75;margin-top:4px}
      #cartDrawer .d-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
      #cartDrawer .d-price{font-weight:800}
    `;
    document.head.appendChild(style);
  }

  // ===== Header include =====
  async function loadHeader() {
    if (document.documentElement.dataset.headerLoaded === "1") return;
    document.documentElement.dataset.headerLoaded = "1";

    const res = await fetch("./header.html", { cache: "no-store" });
    if (!res.ok) throw new Error("header.html not found");
    const html = await res.text();
    document.body.insertAdjacentHTML("afterbegin", html);

    injectDrawerCss();
    renderCartBadge();
    bindHeaderCartButton();
    bindDrawerEvents();
  }

  function renderCartBadge() {
    const badge = $("cartCount");
    if (!badge) return;
    const n = cartCount();
    badge.textContent = String(n);
    badge.hidden = !n;
    badge.style.display = n ? "inline-flex" : "none";
  }

  function bindHeaderCartButton() {
    const cartBtn = document.querySelector('[data-icon="cart"]');
    if (!cartBtn || cartBtn.dataset.bound === "1") return;
    cartBtn.dataset.bound = "1";
    cartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openDrawer();
    });
  }

  // ===== Drawer open/close =====
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

  // ===== Drawer render =====
  function renderDrawer() {
    const cart = readCart();
    const itemsEl = $("cartItems");
    if (!itemsEl) return;

    if (!cart.length) {
      itemsEl.innerHTML = `<div class="muted">購物車是空的</div>`;
      const sub = $("cartSubtotal"); if (sub) sub.textContent = money(0);
      const tot = $("cartTotal"); if (tot) tot.textContent = money(0);
      return;
    }

    itemsEl.innerHTML = cart.map((it) => {
      const img = it.image || "assets/placeholder.png";
      const title = it.title || it.id;
      const price = Number(it.price || 0);
      const qty = normalizeQty(it.qty);
      return `
        <div class="d-item">
          <div class="d-thumb"><img src="${img}" alt=""></div>
          <div class="d-info">
            <div class="d-name">${title}</div>
            <div class="d-meta">${money(price)} × ${qty}</div>
          </div>
          <div class="d-right">
            <div class="d-price">${money(price * qty)}</div>
          </div>
        </div>
      `;
    }).join("");

    const subtotal = cart.reduce((s, i) => s + Number(i.price || 0) * normalizeQty(i.qty), 0);
    const subEl = $("cartSubtotal"); if (subEl) subEl.textContent = money(subtotal);
    const totEl = $("cartTotal"); if (totEl) totEl.textContent = money(subtotal);
  }

  // ===== Events =====
  function bindDrawerEvents() {
    $("cartClose")?.addEventListener("click", closeDrawer);
    $("cartBackdrop")?.addEventListener("click", closeDrawer);

    const go = $("cartGoCheckout");
    if (go && go.dataset.bound !== "1") {
      go.dataset.bound = "1";
      go.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "./cart.html";
      });
    }

    window.addEventListener("cart:changed", () => {
      renderCartBadge();
      const dr = $("cartDrawer");
      if (dr && !dr.hidden) renderDrawer();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  // ===== Init =====
  window.addEventListener("DOMContentLoaded", async () => {
    try {
      await loadHeader();
    } catch (e) {
      console.warn(e);
    }
  });
})();
