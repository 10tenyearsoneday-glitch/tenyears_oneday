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
     Settings（背景抓取，不阻塞 header）
  ========================= */
  let __TEN_SETTINGS = null;
  let __TEN_SETTINGS_LOADING = false;

  async function getSettings({ force = false } = {}) {
    if (!force && __TEN_SETTINGS) return __TEN_SETTINGS;
    if (__TEN_SETTINGS_LOADING) return __TEN_SETTINGS || {};

    __TEN_SETTINGS_LOADING = true;
    try {
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=settings`, {
        cache: "no-store",
      });
      const out = await res.json().catch(() => null);
      if (out?.ok && out.data) {
  __TEN_SETTINGS = normalizeSettings(out.data);
} else {
        __TEN_SETTINGS = __TEN_SETTINGS || {}; // 保留舊值
      }
    } catch (e) {
      console.warn("getSettings failed", e);
      __TEN_SETTINGS = __TEN_SETTINGS || {};
    } finally {
      __TEN_SETTINGS_LOADING = false;
    }
    return __TEN_SETTINGS || {};
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

  function num(v, def = 0) {
    const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : def;
  }

  function truthy(v) {
    // TRUE / true / 1 / "1"
    return v === true || v === 1 || v === "1" || String(v).toUpperCase() === "TRUE";
  }
function normalizeSettings(data) {
  // 如果已經是物件，直接回傳
  if (data && !Array.isArray(data) && typeof data === "object") {
    return data;
  }

  // 如果是 [{key, value}, ...] 轉成 { key: value }
  if (Array.isArray(data)) {
    const obj = {};
    data.forEach(row => {
      if (row && row.key != null) {
        obj[row.key] = row.value;
      }
    });
    return obj;
  }

  return {};
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
  window.TEN.getSettings = () => (__TEN_SETTINGS || null);

  window.TEN.addToCart = function (product, qty = 1) {
    const pid = String(product?.id || "");
    if (!pid) return;

    const cart = readCart();
    const idx = cart.findIndex((x) => x.id === pid);

    const price = num(product.price, 0);

    if (idx === -1) {
      cart.push({
        id: pid,
        title: product.title || "",
        price,
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
     Drawer render（同步渲染 + settings 狀態顯示）
  ========================= */
  function calcSubtotal(cart) {
    return cart.reduce((s, it) => s + num(it.price, 0) * num(it.qty, 0), 0);
  }

  function renderDrawer() {
    const list = $("cartItems");
    if (!list) return;

    const cart = readCart();

    if (!cart.length) {
      list.innerHTML = `<div class="muted">購物車是空的</div>`;
      $("cartSubtotal") && ($("cartSubtotal").textContent = money(0));
      $("cartShipping") && ($("cartShipping").textContent = money(0));
      $("cartTotal") && ($("cartTotal").textContent = money(0));
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
          <button type="button" data-dec="${escapeAttr(it.id)}">-</button>
          <input type="number" min="1" value="${it.qty}" data-qty="${escapeAttr(it.id)}">
          <button type="button" data-inc="${escapeAttr(it.id)}">+</button>
        </div>
        <button type="button" class="d-del" data-del="${escapeAttr(it.id)}">移除</button>
      </div>
    `).join("");

    const subtotal = calcSubtotal(cart);
    $("cartSubtotal") && ($("cartSubtotal").textContent = money(subtotal));

    // settings 尚未載入：顯示「計算中…」避免誤顯示免運
   const settings = await getSettings();

  let shipping = 0;
  if (settings.shipping_enable) {
    const fee = Number(settings.shipping_fee || 0);
    const freeTh = Number(settings.free_shipping_th || 0);
    shipping = subtotal >= freeTh ? 0 : fee;
  }

  $("cartShipping") && (
    $("cartShipping").textContent =
      shipping === 0 ? "免運" : money(shipping)
  );

  /* =========================
     Drawer events（補回！）
  ========================= */
  document.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const del = e.target.closest("[data-del]");
    if (!inc && !dec && !del) return;

    let cart = readCart();

    if (inc) {
      const i = cart.find(x => x.id === inc.dataset.inc);
      if (i) i.qty = normalizeQty(num(i.qty, 1) + 1);
    }

    if (dec) {
      const i = cart.find(x => x.id === dec.dataset.dec);
      if (i) i.qty = normalizeQty(Math.max(1, num(i.qty, 1) - 1));
    }

    if (del) {
      cart = cart.filter(x => x.id !== del.dataset.del);
    }

    writeCart(cart);
  });

  document.addEventListener("change", (e) => {
    const inp = e.target.closest("[data-qty]");
    if (!inp) return;
    const id = inp.dataset.qty;
    const cart = readCart();
    const i = cart.find(x => x.id === id);
    if (i) i.qty = normalizeQty(inp.value);
    writeCart(cart);
  });

  /* =========================
     Global listeners
  ========================= */
  window.addEventListener("cart:changed", () => {
    renderCartBadge();
    renderDrawer();
  });

  window.addEventListener("DOMContentLoaded", async () => {
    // ⭐ header 先載入（解決你說的 header 很慢）
    await loadHeader();
    renderCartBadge();
    renderDrawer(); // 先用「計算中…」畫一次

    // ⭐ settings 背景抓到後，再更新運費/合計
    await getSettings({ force: true });
    renderDrawer();
  });
})();
