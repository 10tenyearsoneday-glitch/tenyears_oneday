(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;

  const CART_KEY = "ten_cart";
  const APPLIED_KEY = "ten_applied_coupon_v1";
  const GAS_PRODUCTS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const $ = (id) => document.getElementById(id);
  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;

  /* ---------------- 工具 ---------------- */
  function normalizeQty(n) {
    n = Number(n || 1);
    if (!Number.isFinite(n) || n < 1) n = 1;
    return Math.floor(n);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, "");
  }

  /* ---------------- 購物車 Storage ---------------- */
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

  /* ---------------- Settings（從 GAS 讀取） ---------------- */
  async function fetchSettings() {
    try {
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=settings`, { cache: "no-store" });
      const out = await res.json().catch(() => null);
      if (!out || out.ok !== true || !out.data) return {};
      return out.data; // { shipping_enable: true, shipping_fee: 60, ... }
    } catch (e) {
      console.warn("fetchSettings failed:", e);
      return {};
    }
  }
  window.TEN_fetchSettings = fetchSettings; // 給 checkout 頁面用

  /* ---------------- 公開 API ---------------- */
  window.TEN = window.TEN || {};
  window.TEN.readCart = readCart;
  window.TEN.writeCart = writeCart;

  window.TEN.addToCart = function (product, qty = 1) {
    const pid = String(product?.id || "");
    if (!pid) return;
    const cart = readCart();
    const idx = cart.findIndex((x) => x.id === pid);
    if (idx === -1) {
      cart.push({
        id: pid,
        title: product.title || "",
        price: Number(product.price || 0),
        image: product.image || "",
        qty: normalizeQty(qty),
      });
    } else {
      cart[idx].qty = normalizeQty(cart[idx].qty + qty);
    }
    writeCart(cart);
  };

  /* ---------------- Header ---------------- */
  async function loadHeader() {
    if (document.documentElement.dataset.headerLoaded === "1") return;
    document.documentElement.dataset.headerLoaded = "1";
    try {
      const res = await fetch("./header.html", { cache: "no-store" });
      if (!res.ok) return;
      const html = await res.text();
      document.body.insertAdjacentHTML("afterbegin", html);
      ensureCartBadge();
      bindCartIcon();
      bindDrawerClose();
      renderCartBadge();
    } catch {}
  }
  function ensureCartBadge() {
    if ($("cartCount")) return;
    const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!cartA) return;
    const span = document.createElement("span");
    span.id = "cartCount";
    span.className = "cart-badge";
    span.hidden = true;
    cartA.appendChild(span);
  }
  function renderCartBadge() {
    const el = $("cartCount");
    if (!el) return;
    const n = cartCount();
    el.textContent = n;
    el.hidden = n <= 0;
  }

  /* ---------------- Drawer ---------------- */
  function openDrawer() {
    $("cartBackdrop")?.classList.add("open");
    $("cartDrawer")?.classList.add("open");
    $("cartBackdrop") && ($("cartBackdrop").hidden = false);
    $("cartDrawer") && ($("cartDrawer").hidden = false);
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
    }, 200);
  }
  function bindCartIcon() {
    const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!cartA) return;
    cartA.addEventListener("click", (e) => {
      e.preventDefault();
      openDrawer();
    });
  }
  function bindDrawerClose() {
    $("cartClose")?.addEventListener("click", closeDrawer);
    $("cartBackdrop")?.addEventListener("click", closeDrawer);
  }

  function renderDrawer() {
    const list = $("cartItems");
    if (!list) return;
    const cart = readCart();
    if (!cart.length) {
      list.innerHTML = `<div class="muted">購物車是空的</div>`;
      $("cartSubtotal") && ($("cartSubtotal").textContent = money(0));
      $("cartTotal") && ($("cartTotal").textContent = money(0));
      return;
    }
    list.innerHTML = cart.map(it => `
      <div class="d-item">
        <img src="${it.image || "assets/placeholder.png"}">
        <div class="d-info">
          <div>${escapeHtml(it.title)}</div>
          <div>${money(it.price)}</div>
        </div>
        <div class="d-qty">
          <button data-dec="${escapeAttr(it.id)}">-</button>
          <input type="number" min="1" value="${it.qty}" data-qty="${escapeAttr(it.id)}">
          <button data-inc="${escapeAttr(it.id)}">+</button>
        </div>
        <button data-del="${escapeAttr(it.id)}">移除</button>
      </div>`).join("");
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
    $("cartSubtotal") && ($("cartSubtotal").textContent = money(subtotal));
    $("cartTotal") && ($("cartTotal").textContent = money(subtotal));
  }

  /* ---------------- Drawer事件 ---------------- */
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
      if (i && i.qty > 1) i.qty--;
    }
    if (del) {
      cart = cart.filter((x) => x.id !== del.dataset.del);
    }
    writeCart(cart);
  });

  document.addEventListener("change", (e) => {
    const inp = e.target.closest("[data-qty]");
    if (!inp) return;
    const cart = readCart();
    const i = cart.find((x) => x.id === inp.dataset.qty);
    if (i) i.qty = normalizeQty(inp.value);
    writeCart(cart);
  });

  /* ---------------- 全域監聽 ---------------- */
  window.addEventListener("cart:changed", () => {
    renderCartBadge();
    renderDrawer();
  });
  window.addEventListener("DOMContentLoaded", async () => {
    await loadHeader();
    renderCartBadge();
    renderDrawer();
  });
})();
