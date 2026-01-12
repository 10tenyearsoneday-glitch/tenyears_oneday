(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;

  /* =========================
     基本設定
  ========================= */
  const CART_KEY = "ten_cart";
  const GAS_PRODUCTS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const $ = (id) => document.getElementById(id);
  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;

  /* =========================
     Settings（只抓一次）
  ========================= */
  let __TEN_SETTINGS = null;

  async function getSettings() {
    if (__TEN_SETTINGS) return __TEN_SETTINGS;
    try {
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=settings`, {
        cache: "no-store",
      });
      const out = await res.json().catch(() => null);
      if (out?.ok && out.data) {
        __TEN_SETTINGS = out.data;
        return out.data;
      }
    } catch (e) {
      console.warn("getSettings failed", e);
    }
    __TEN_SETTINGS = {};
    return {};
  }

  /* =========================
     工具
  ========================= */
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
    return readCart().reduce((s, it) => s + normalizeQty(it.qty), 0);
  }

  /* =========================
     Public API
  ========================= */
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
        price: Number(String(product.price).replace(/[^\d.-]/g, "")) || 0,
        image: product.image || "",
        qty: normalizeQty(qty),
      });
    } else {
      cart[idx].qty = normalizeQty(cart[idx].qty + qty);
    }

    writeCart(cart);
  };

  /* =========================
     Header
  ========================= */
  async function loadHeader() {
    if (document.documentElement.dataset.headerLoaded === "1") return;
    document.documentElement.dataset.headerLoaded = "1";

    try {
      const res = await fetch("./header.html", { cache: "no-store" });
      if (!res.ok) return;
      const html = await res.text();
      document.body.insertAdjacentHTML("afterbegin", html);

      bindCartIcon();
      bindDrawerClose();
      bindClearCart();
      bindCheckoutBtn();
      renderCartBadge();
    } catch {}
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

  function bindClearCart() {
    $("cartClear")?.addEventListener("click", () => {
      if (!confirm("確定要清空購物車嗎？")) return;
      writeCart([]);
    });
  }

  function bindCheckoutBtn() {
    $("cartGoCheckout")?.addEventListener("click", () => {
      window.location.href = "./cart.html";
    });
  }

  /* =========================
     Drawer render（最終穩定版）
  ========================= */
  function renderDrawer() {
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
        <div class="d-thumb">
          <img src="${it.image || "assets/placeholder.png"}">
        </div>
        <div class="d-info">
          <div class="d-name">${escapeHtml(it.title)}</div>
          <div class="d-meta">${money(it.price)}</div>
        </div>
        <div class="d-qty">
          <button data-dec="${escapeAttr(it.id)}">-</button>
          <input type="number" min="1" value="${it.qty}" data-qty="${escapeAttr(it.id)}">
          <button data-inc="${escapeAttr(it.id)}">+</button>
        </div>
        <button class="d-del" data-del="${escapeAttr(it.id)}">移除</button>
      </div>
    `).join("");

    // 小計（型別安全）
    const subtotal = cart.reduce(
      (s, it) => s + Number(it.price) * Number(it.qty),
      0
    );
    $("cartSubtotal").textContent = money(subtotal);

    // === 運費（同步、穩定）===
    const settings = __TEN_SETTINGS || {};

    const shippingEnabled =
      settings.shipping_enable === true ||
      settings.shipping_enable === "TRUE" ||
      settings.shipping_enable === "true" ||
      settings.shipping_enable === 1 ||
      settings.shipping_enable === "1";

    const fee = Number(String(settings.shipping_fee ?? "0").replace(/[^\d.-]/g, ""));
    const freeTh = Number(String(settings.free_shipping_th ?? "").replace(/[^\d.-]/g, ""));

    let shipping = 0;
    if (shippingEnabled) {
      if (!Number.isFinite(fee) || fee <= 0) {
        shipping = 0;
      } else if (!Number.isFinite(freeTh) || freeTh <= 0) {
        shipping = fee;
      } else {
        shipping = subtotal >= freeTh ? 0 : fee;
      }
    }

    $("cartShipping").textContent = shipping === 0 ? "免運" : money(shipping);
    $("cartTotal").textContent = money(subtotal + shipping);
  }

  /* =========================
     Global listeners
  ========================= */
  window.addEventListener("cart:changed", () => {
    renderCartBadge();
    renderDrawer();
  });

  window.addEventListener("DOMContentLoaded", async () => {
    await getSettings();      // ⭐ 先抓 settings
    await loadHeader();
    renderCartBadge();
    renderDrawer();
  });
})();
