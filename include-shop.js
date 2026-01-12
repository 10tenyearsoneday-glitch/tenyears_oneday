// include-shop.js (FINAL - shop only)
// Handles: header.html injection, cart drawer (right panel), cart badge, qty +/- remove, clear cart, coupon apply (GAS),
// and (optional) cart.html page rendering.
// NOTE: Checkout is kept as a page jump (cart.html) to avoid JS complexity before ECPay integration.

(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;
  // ========= Guard: don't run on admin/backstage pages =========
  const __p = (location.pathname.split('/').pop() || '').toLowerCase();
  if (__p.includes('admin') || __p.includes('backend') || __p.includes('manage')) {
    // This file is for storefront pages only.
    window.TEN_SHOP_LOADED = false;
    return;
  }


  // ========= Config =========
  const CART_KEY = "ten_cart";
  const MEMBER_KEY = "ten_member_id";
  const APPLIED_KEY = "ten_applied_coupon_v1";

  window.TEN_CONFIG = window.TEN_CONFIG || {
    products_gas_url: "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec",
  };

  const GAS_PRODUCTS_URL = window.TEN_CONFIG.products_gas_url;

  // ========= Helpers =========
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

  function getId() {
    let id = localStorage.getItem(MEMBER_KEY);
    if (!id) {
      id = "M-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      localStorage.setItem(MEMBER_KEY, id);
    }
    return id;
  }

  // Backward-compat alias (older code may call getMemberId)
  function getMemberId(){ return getId(); }

  // ========= Cart Storage =========
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

  function ensureCartBadgeNode() {
    if ($("cartCount")) return;
    const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!cartA) return;
    const span = document.createElement("span");
    span.id = "cartCount";
    span.className = "cart-badge";
    span.hidden = true;
    cartA.appendChild(span);
  }

  // ========= Coupon State =========
  function readApplied() {
    try {
      const o = JSON.parse(localStorage.getItem(APPLIED_KEY) || "null");
      if (o && typeof o === "object") return { code: String(o.code || ""), discount: Number(o.discount || 0), note: String(o.note || "") };
    } catch {}
    return { code: "", discount: 0, note: "" };
  }

  function writeApplied(applied) {
    const a = {
      code: String(applied?.code || "").trim().toUpperCase(),
      discount: Math.max(0, Number(applied?.discount || 0)),
      note: String(applied?.note || "")
    };
    localStorage.setItem(APPLIED_KEY, JSON.stringify(a));
    window.TEN_APPLIED = a;
  }

  window.TEN_APPLIED = window.TEN_APPLIED || readApplied();

  // ========= Public API =========
  window.TEN = window.TEN || {};
  window.TEN.readCart = readCart;
  window.TEN.writeCart = writeCart;

  function addToCart(product, qty = 1) {
    const pid = String(product?.id ?? "").trim();
    if (!pid) return { ok: false, error: "NO_ID" };

    const cart = readCart();
    const i = cart.findIndex(x => String(x.id) === pid);
    const q = normalizeQty(qty);

    if (i === -1) {
      cart.push({
        id: pid,
        title: product?.title || "",
        price: Number(product?.price || 0),
        image: product?.image || "",
        qty: q
      });
    } else {
      cart[i].qty = normalizeQty(Number(cart[i].qty || 1) + q);
      // keep existing fields; only fill missing
      if (!cart[i].title && product?.title) cart[i].title = product.title;
      if ((cart[i].price == null || cart[i].price === "") && product?.price != null) cart[i].price = Number(product.price);
      if (!cart[i].image && product?.image) cart[i].image = product.image;
    }

    writeCart(cart);
    return { ok: true };
  }
  window.TEN.addToCart = addToCart;

  // ========= Header =========
  async function loadHeader() {
    if (document.documentElement.dataset.headerLoaded === "1") return;
    document.documentElement.dataset.headerLoaded = "1";

    try {
      const res = await fetch("./header.html", { cache: "no-store" });
      if (!res.ok) throw new Error(`header fetch ${res.status}`);
      const html = await res.text();
      document.body.insertAdjacentHTML("afterbegin", html);

      // active styles (safe if missing)
      const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
      const navKey = page.replace(".html", "");
      const navLink = document.querySelector(`.nav-row a[data-nav="${navKey}"]`);
      if (navLink) navLink.classList.add("active");

      const iconMap = { "search.html": "search", "cart.html": "cart", "member.html": "member" };
      const iconKey = iconMap[page];
      if (iconKey) {
        const icon = document.querySelector(`.icon-row a[data-icon="${iconKey}"]`);
        if (icon) icon.classList.add("active");
      }

      ensureCartBadgeNode();
      bindDrawerClose();
      bindCartIconOpen();
      bindDrawerActions();
      renderCartBadge();

    } catch (e) {
      console.warn("loadHeader failed:", e);
    }
  }

  // ========= Drawer open/close =========
  function openDrawer() {
    const bd = $("cartBackdrop");
    const dr = $("cartDrawer");
    if (!bd || !dr) return;

    bd.hidden = false;
    dr.hidden = false;

    bd.classList.add("open");
    dr.classList.add("open");

    document.body.style.overflow = "hidden";

    const inp = $("drawerCouponCode");
    if (inp && window.TEN_APPLIED?.code) inp.value = window.TEN_APPLIED.code;

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

  function bindDrawerClose() {
    if (window.TEN_DRAWER_CLOSE_BOUND) return;
    window.TEN_DRAWER_CLOSE_BOUND = true;

    $("cartClose")?.addEventListener("click", closeDrawer);
    $("cartBackdrop")?.addEventListener("click", closeDrawer);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  function bindCartIconOpen() {
    if (window.TEN_CART_ICON_BOUND) return;
    window.TEN_CART_ICON_BOUND = true;

    const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!cartA) return;

    cartA.addEventListener("click", (e) => {
      e.preventDefault();
      openDrawer();
    });
  }

  function renderCartBadge() {
    const el = $("cartCount");
    if (!el) return;
    const n = cartCount();
    if (n > 0) {
      el.textContent = String(n);
      el.hidden = false;
      el.style.display = "inline-flex";
    } else {
      el.textContent = "";
      el.hidden = true;
      el.style.display = "none";
    }
  }

  // ========= Drawer render =========
  function hydrateCartItem(raw) {
    return {
      id: String(raw?.id ?? ""),
      title: String(raw?.title ?? ""),
      price: Number(raw?.price ?? 0),
      image: String(raw?.image ?? ""),
      qty: normalizeQty(raw?.qty)
    };
  }

  function itemRowHtml(raw) {
    const it = hydrateCartItem(raw);
    const img = it.image || "assets/placeholder.png";
    const title = it.title || it.id || "商品";
    const lineTotal = it.price * it.qty;

    return `
      <div class="d-item">
        <div class="d-thumb"><img src="${img}" alt=""></div>

        <div class="d-info">
          <div class="d-name">${escapeHtml(title)}</div>
          <div class="d-meta">${money(it.price)}</div>
        </div>

        <div class="d-right">
          <div class="d-price">${money(lineTotal)}</div>
          <div class="d-qty">
            <button type="button" data-dec="${escapeAttr(it.id)}" aria-label="減少">-</button>
            <input type="number" min="1" step="1" value="${it.qty}" data-qty="${escapeAttr(it.id)}">
            <button type="button" data-inc="${escapeAttr(it.id)}" aria-label="增加">+</button>
          </div>
          <button class="d-del" type="button" data-del="${escapeAttr(it.id)}">移除</button>
        </div>
      </div>
    `;
  }

  function renderDrawer() {
    const itemsEl = $("cartItems");
    if (!itemsEl) return;

    const cartRaw = readCart();
    const cart = cartRaw.map(hydrateCartItem);

    if (!cart.length) {
      itemsEl.innerHTML = `<div class="muted">購物車是空的。</div>`;
    } else {
      itemsEl.innerHTML = cartRaw.map(itemRowHtml).join("");
    }

    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const applied = window.TEN_APPLIED || { discount: 0 };
    const discount = Math.min(subtotal, Math.max(0, Number(applied.discount || 0)));
    const total = Math.max(0, subtotal - discount);

    $("cartSubtotal") && ($("cartSubtotal").textContent = money(subtotal));
    $("cartDiscount") && ($("cartDiscount").textContent = `- ${money(discount)}`);
    $("cartTotal") && ($("cartTotal").textContent = money(total));
    // shipping/other totals left for later (no breaking if missing)
    $("cartShipping") && ($("cartShipping").textContent = money(0));

    const checkoutBtn = $("cartGoCheckout");
    if (checkoutBtn) checkoutBtn.disabled = subtotal <= 0;
  }

  // ========= Drawer operations =========
  function setQty(id, qty) {
    const cart = readCart();
    const i = cart.findIndex(x => String(x.id) === String(id));
    if (i === -1) return;
    cart[i].qty = normalizeQty(qty);
    writeCart(cart);
  }

  function changeQty(id, delta) {
    const cart = readCart();
    const i = cart.findIndex(x => String(x.id) === String(id));
    if (i === -1) return;
    cart[i].qty = normalizeQty(Number(cart[i].qty || 1) + Number(delta || 1));
    writeCart(cart);
  }

  function removeItem(id) {
    const cart = readCart().filter(x => String(x.id) !== String(id));
    writeCart(cart);
  }

  function clearCart() {
    writeCart([]);
    writeApplied({ code: "", discount: 0, note: "" });
    const inp = $("drawerCouponCode");
    if (inp) inp.value = "";
  }

  // ========= Coupon =========
  function couponErrorText(err) {
    const m = {
      CODE_REQUIRED: "請輸入優惠碼",
      INVALID_CODE: "優惠碼不存在",
      DISABLED: "此優惠碼已停用",
      MIN_SPEND: "未達最低消費門檻",
      NOT_STARTED: "優惠尚未開始",
      EXPIRED: "優惠已過期",
      SOLD_OUT: "優惠已用完",
      ALREADY_USED: "你已使用過此優惠碼",
      SERVER_ERROR: "系統忙碌，請稍後再試",
    };
    return m[String(err || "")] || `套用失敗（${err || "ERROR"}）`;
  }

  function showCouponToast(msg, ok = true) {
    const el = $("drawerCouponToast");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
    if (msg) setTimeout(() => (el.textContent = ""), 2200);
  }

  async function validateCoupon(code, subtotal) {
    const memberId = getId();
    const url =
      `${GAS_PRODUCTS_URL}?path=coupon_validate` +
      `&code=${encodeURIComponent(code)}` +
      `&memberId=${encodeURIComponent(memberId)}` +
      `&subtotal=${encodeURIComponent(subtotal)}`;

    const res = await fetch(url, { cache: "no-store" });
    const out = await res.json().catch(() => null);
    return out;
  }

  async function applyCouponFromDrawer() {
    const cart = readCart().map(hydrateCartItem);
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const inp = $("drawerCouponCode");
    const code = String(inp?.value || "").trim().toUpperCase();

    if (!code) return showCouponToast("請輸入優惠碼", false);
    if (subtotal <= 0) return showCouponToast("購物車是空的", false);

    try {
      showCouponToast("驗證中…");
      const out = await validateCoupon(code, subtotal);

      if (!out || out.ok !== true) {
        writeApplied({ code: "", discount: 0, note: "" });
        renderDrawer();
        return showCouponToast(couponErrorText(out?.error), false);
      }

      writeApplied({
        code: out.code || code,
        discount: Math.max(0, Number(out.discount || 0)),
        note: String(out.note || "")
      });

      renderDrawer();
      showCouponToast(`已套用 ${window.TEN_APPLIED.code} ✅ 折抵 ${money(window.TEN_APPLIED.discount)}`);
    } catch (e) {
      console.error(e);
      writeApplied({ code: "", discount: 0, note: "" });
      renderDrawer();
      showCouponToast("系統忙碌，請稍後再試", false);
    }
  }

  // ========= Drawer bindings =========
  function bindDrawerActions() {
    if (window.TEN_DRAWER_ACTIONS_BOUND) return;
    window.TEN_DRAWER_ACTIONS_BOUND = true;

    $("cartClear")?.addEventListener("click", () => {
      if (!confirm("確定要清空購物車嗎？")) return;
      clearCart();
      renderDrawer();
      renderCartBadge();
    });

    $("drawerApplyCoupon")?.addEventListener("click", applyCouponFromDrawer);

    $("drawerCouponCode")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyCouponFromDrawer();
    });

    $("cartGoCheckout")?.addEventListener("click", (e) => {
      e.preventDefault();
      // Keep checkout as a page jump (stable)
      window.location.href = "./cart.html";
    });

    const items = $("cartItems");
    if (items) {
      // event delegation
      items.addEventListener("click", (e) => {
        const incBtn = e.target.closest("[data-inc]");
        const decBtn = e.target.closest("[data-dec]");
        const delBtn = e.target.closest("[data-del]");
        if (incBtn) return changeQty(incBtn.getAttribute("data-inc"), +1);
        if (decBtn) return changeQty(decBtn.getAttribute("data-dec"), -1);
        if (delBtn) return removeItem(delBtn.getAttribute("data-del"));
      });

      items.addEventListener("change", (e) => {
        const inp = e.target.closest("[data-qty]");
        if (!inp) return;
        setQty(inp.getAttribute("data-qty"), inp.value);
      });
    }
  }

  // ========= Cart Page (optional) =========
  function renderCartPage() {
    const app = $("cartPageApp");
    if (!app) return;

    const cart = readCart().map(hydrateCartItem);
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const discount = Math.min(subtotal, Math.max(0, Number(window.TEN_APPLIED?.discount || 0)));
    const total = Math.max(0, subtotal - discount);

    const list = cart.length
      ? cart.map((it) => `
          <div class="cp-row">
            <div class="cp-left">
              <img class="cp-img" src="${it.image || "assets/placeholder.png"}" alt="">
              <div class="cp-info">
                <div class="cp-title">${escapeHtml(it.title || it.id)}</div>
                <div class="cp-price">${money(it.price)}</div>
              </div>
            </div>
            <div class="cp-qty">
              <button type="button" class="cp-btn" data-cp-dec="${escapeAttr(it.id)}">-</button>
              <input class="cp-input" type="number" min="1" step="1" value="${it.qty}" data-cp-qty="${escapeAttr(it.id)}">
              <button type="button" class="cp-btn" data-cp-inc="${escapeAttr(it.id)}">+</button>
            </div>
            <div class="cp-right">
              <div class="cp-line">${money(it.price * it.qty)}</div>
              <button type="button" class="cp-remove" data-cp-del="${escapeAttr(it.id)}">移除</button>
            </div>
          </div>
        `).join("")
      : `<div class="muted" style="padding:16px;">購物車是空的。</div>`;

    app.innerHTML = `
      <div class="cp-card">
        <div class="cp-head">
          <div class="cp-h1">購物車</div>
          <button type="button" class="cp-clear" id="cpClear">清空</button>
        </div>

        <div class="cp-list" id="cpList">${list}</div>

        <div class="cp-coupon">
          <input id="cpCoupon" placeholder="優惠碼" value="${escapeAttr(window.TEN_APPLIED?.code || "")}">
          <button type="button" id="cpApply">套用</button>
          <div id="cpToast" class="cp-toast"></div>
        </div>

        <div class="cp-sum">
          <div><span>小計</span><strong id="cpSubtotal">${money(subtotal)}</strong></div>
          <div><span>折扣</span><strong id="cpDiscount">- ${money(discount)}</strong></div>
          <div class="cp-total"><span>合計</span><strong id="cpTotal">${money(total)}</strong></div>
        </div>

        <div class="cp-actions">
          <a class="cp-back" href="./index.html">繼續逛</a>
          <button type="button" class="cp-next" id="cpNext" ${subtotal<=0?"disabled":""}>下一步（先不接金流）</button>
        </div>
      </div>
    `;

    // bind
    $("cpClear")?.addEventListener("click", () => {
      if (!confirm("確定要清空購物車嗎？")) return;
      clearCart();
      renderCartPage();
      renderCartBadge();
    });

    $("cpApply")?.addEventListener("click", async () => {
      const code = String($("cpCoupon")?.value || "").trim().toUpperCase();
      if (!code) {
        cpToast("請輸入優惠碼", false);
        return;
      }
      if (subtotal <= 0) {
        cpToast("購物車是空的", false);
        return;
      }
      try {
        cpToast("驗證中…");
        const out = await validateCoupon(code, subtotal);
        if (!out || out.ok !== true) {
          writeApplied({ code: "", discount: 0, note: "" });
          renderCartPage();
          cpToast(couponErrorText(out?.error), false);
          return;
        }
        writeApplied({ code: out.code || code, discount: Number(out.discount || 0), note: String(out.note || "") });
        renderCartPage();
        cpToast(`已套用 ${window.TEN_APPLIED.code} ✅`, true);
      } catch (e) {
        console.error(e);
        cpToast("系統忙碌，請稍後再試", false);
      }
    });

    $("cpList")?.addEventListener("click", (e) => {
      const inc = e.target.closest("[data-cp-inc]");
      const dec = e.target.closest("[data-cp-dec]");
      const del = e.target.closest("[data-cp-del]");
      if (inc) { changeQty(inc.getAttribute("data-cp-inc"), +1); return; }
      if (dec) { changeQty(dec.getAttribute("data-cp-dec"), -1); return; }
      if (del) { removeItem(del.getAttribute("data-cp-del")); return; }
    });

    $("cpList")?.addEventListener("change", (e) => {
      const inp = e.target.closest("[data-cp-qty]");
      if (!inp) return;
      setQty(inp.getAttribute("data-cp-qty"), inp.value);
    });

    $("cpNext")?.addEventListener("click", async () => {
      // For now: create unpaid order in sheet and show success; later connect ECPay
      const cart2 = readCart().map(hydrateCartItem);
      if (!cart2.length) return alert("購物車是空的");

      const payload = {
        orderId: "O-" + Date.now(),
        memberId: getId(),
        couponCode: String(window.TEN_APPLIED?.code || ""),
        items: cart2,
        subtotal: cart2.reduce((s, it) => s + it.price * it.qty, 0),
        discount: Math.min(cart2.reduce((s, it) => s + it.price * it.qty, 0), Math.max(0, Number(window.TEN_APPLIED?.discount || 0))),
        total: total,
        status: "UNPAID",
        createdAt: new Date().toISOString()
      };

      try {
        const res = await fetch(`${GAS_PRODUCTS_URL}?path=order_create&key=${encodeURIComponent(ADMIN_KEY)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const out = await res.json().catch(() => null);
        if (!res.ok || !out?.ok) {
          alert("建立訂單失敗：" + (out?.error || "SERVER_ERROR"));
          return;
        }
        clearCart();
        renderCartPage();
        renderCartBadge();
        alert("✅ 已建立訂單（未付款）。接下來再接綠界。");
      } catch (e) {
        console.error(e);
        alert("系統忙碌，請稍後再試");
      }
    });
  }

  function cpToast(msg, ok=true) {
    const el = $("cpToast");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
    if (msg) setTimeout(() => (el.textContent = ""), 2200);
  }

  // ========= Escaping =========
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

  // ========= Global listeners =========
  function bindListeners() {
    if (window.TEN_SHOP_LISTENERS_BOUND) return;
    window.TEN_SHOP_LISTENERS_BOUND = true;

    window.addEventListener("cart:changed", () => {
      renderCartBadge();

      const dr = $("cartDrawer");
      if (dr && dr.classList.contains("open")) renderDrawer();

      renderCartPage();
    });

    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY || e.key === APPLIED_KEY) {
        renderCartBadge();
        renderCartPage();
      }
    });
  }

  // ========= Init =========
  window.addEventListener("DOMContentLoaded", async () => {
    await loadHeader();
    bindListeners();
    renderDrawer();   // safe if drawer not in DOM yet
    renderCartPage(); // safe if not on cart.html
    renderCartBadge();
  });
})();
