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
     Settings
  ========================= */
  let __TEN_SETTINGS = null;
  let __TEN_SETTINGS_LOADING = false;

  function normalizeSettings(data) {
    if (data && !Array.isArray(data) && typeof data === "object") return data;
    if (Array.isArray(data)) {
      const o = {};
      data.forEach(r => { if (r?.key != null) o[r.key] = r.value; });
      return o;
    }
    return {};
  }

  async function getSettings() {
    if (__TEN_SETTINGS || __TEN_SETTINGS_LOADING) return __TEN_SETTINGS || {};
    __TEN_SETTINGS_LOADING = true;
    try {
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=settings`, { cache: "no-store" });
      const out = await res.json().catch(() => null);
      __TEN_SETTINGS = out?.ok ? normalizeSettings(out.data) : {};
    } catch {
      __TEN_SETTINGS = {};
    } finally {
      __TEN_SETTINGS_LOADING = false;
    }
    return __TEN_SETTINGS;
  }

  /* =========================
     工具
  ========================= */
  const truthy = (v) => v === true || v === 1 || v === "1" || String(v).toUpperCase() === "TRUE";
  const num = (v, d = 0) => {
    const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : d;
  };
  const normalizeQty = (n) => Math.max(1, Math.floor(Number(n || 1)));
  const escapeHtml = (s) =>
    String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const escapeAttr = (s) => escapeHtml(s).replace(/`/g,"");

  /* =========================
     Cart storage
  ========================= */
  const readCart = () => {
    try { const a = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); return Array.isArray(a)?a:[]; }
    catch { return []; }
  };
  const writeCart = (items) => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart:changed"));
  };
  const cartCount = () => readCart().reduce((s,it)=>s+normalizeQty(it.qty),0);

  /* =========================
     Public API
  ========================= */
  window.TEN = window.TEN || {};
  window.TEN.addToCart = (product, qty = 1) => {
    const pid = String(product?.id || "");
    if (!pid) return;
    const cart = readCart();
    const i = cart.findIndex(x => x.id === pid);
    const price = num(product.price, 0);
    if (i === -1) cart.push({ id: pid, title: product.title||"", price, image: product.image||"", qty: normalizeQty(qty) });
    else cart[i].qty = normalizeQty(cart[i].qty + qty);
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
      document.body.insertAdjacentHTML("afterbegin", await res.text());
      bindCartIcon(); bindDrawerClose(); bindClearCart(); bindCheckoutBtn();
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
    if (__TEN_SETTINGS) renderDrawer();
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
    a && a.addEventListener("click", (e)=>{ e.preventDefault(); openDrawer(); });
  }
  function bindDrawerClose() {
    $("cartClose")?.addEventListener("click", closeDrawer);
    $("cartBackdrop")?.addEventListener("click", closeDrawer);
  }
  function bindClearCart() {
    $("cartClear")?.addEventListener("click", ()=>{ if(confirm("確定要清空購物車嗎？")) writeCart([]); });
  }
  function bindCheckoutBtn() {
    $("cartGoCheckout")?.addEventListener("click", ()=>{ location.href="./cart.html"; });
  }

  /* =========================
     Drawer render
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

    list.innerHTML = cart.map(it=>`
      <div class="d-item">
        <div class="d-thumb"><img src="${it.image||""}"></div>
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

    const subtotal = cart.reduce((s,it)=>s+num(it.price)*num(it.qty),0);
    $("cartSubtotal").textContent = money(subtotal);

    if (!__TEN_SETTINGS) {
      $("cartShipping").textContent = "計算中…";
      $("cartTotal").textContent = money(subtotal);
      return;
    }

    const s = __TEN_SETTINGS;
    const enabled = truthy(s.shipping_enabled);
    const fee = num(s.shipping_fee, 0);
    const th = num(s.free_shipping_threshold, 0);

    let shipping = 0;
    if (enabled && fee > 0) shipping = th > 0 && subtotal >= th ? 0 : fee;

    $("cartShipping").textContent = (enabled && shipping === 0) ? "免運" : money(shipping);
    $("cartTotal").textContent = money(subtotal + shipping);
  }

  /* =========================
     Drawer events
  ========================= */
  document.addEventListener("click", (e)=>{
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const del = e.target.closest("[data-del]");
    if (!inc && !dec && !del) return;
    let cart = readCart();
    if (inc) { const i = cart.find(x=>x.id===inc.dataset.inc); if(i) i.qty=normalizeQty(i.qty+1); }
    if (dec) { const i = cart.find(x=>x.id===dec.dataset.dec); if(i) i.qty=normalizeQty(Math.max(1,i.qty-1)); }
    if (del) cart = cart.filter(x=>x.id!==del.dataset.del);
    writeCart(cart);
  });
  document.addEventListener("change",(e)=>{
    const inp = e.target.closest("[data-qty]");
    if (!inp) return;
    const cart = readCart();
    const i = cart.find(x=>x.id===inp.dataset.qty);
    if (i) i.qty = normalizeQty(inp.value);
    writeCart(cart);
  });

  /* =========================
     Init
  ========================= */
  window.addEventListener("cart:changed", ()=>{ renderCartBadge(); renderDrawer(); });
  window.addEventListener("DOMContentLoaded", async ()=>{
    await loadHeader();
    renderCartBadge();
    renderDrawer();
    await getSettings();
    renderDrawer();
  });
})();
