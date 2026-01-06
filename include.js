// include.js（方案 A：header + badge + cart drawer + coupon）
// - 插入 header.html
// - nav/icon active
// - 右上角購物車 badge (#cartCount)
// - 點購物車 icon 直接開抽屜（不用跳 cart.html）
// - 抽屜內：商品列表/數量/刪除/小計/運費/免運差額/優惠碼/結帳（示意寫入 coupon_use）
// - 避免重複宣告：全部掛在 window.TEN_* 上並做初始化鎖

(() => {
  if (window.TEN_INCLUDE_LOADED) return;
  window.TEN_INCLUDE_LOADED = true;

  // ===== 全域設定（避免各頁 const 重複宣告爆掉）=====
  window.API_BASE = window.API_BASE || "https://tenyears-oneday-api.onrender.com";

  const CART_KEY = "ten_cart";
  const MEMBER_KEY = "ten_member_id";

  // 你 cart.html 用的 GAS（沿用）
  const GAS_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
  const ADMIN_KEY = "10years1day911321"; // ⚠️ 前端公開會曝光；先照你現況沿用

  // settings 預設（後台抓不到也不會壞）
  window.TEN_SETTINGS = window.TEN_SETTINGS || {
    shipping_enabled: true,
    shipping_fee: 60,
    free_shipping_threshold: 1000,
    first_purchase_discount: 0.9,
    birthday_discount: 0.85
  };

  // 已套用優惠碼狀態
  window.TEN_APPLIED = window.TEN_APPLIED || { code: "", discount: 0, note: "" };

  // ===== 共用工具 =====
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
    return readCart().reduce((s, it) => s + Math.max(0, Number(it.qty || 0)), 0);
  }

  function money(n) {
    n = Math.round(Number(n || 0));
    return `NT$ ${n}`;
  }

  function normalizeQty(n) {
    n = Number(n || 1);
    if (!Number.isFinite(n) || n < 1) n = 1;
    return Math.floor(n);
  }

  function rateToZhe(rate) {
    rate = Number(rate || 1);
    if (rate >= 1 || rate <= 0) return null;
    const z = Math.round(rate * 100) / 10;
    return String(z).replace(/\.0$/, "");
  }

  // ===== Header =====
  async function loadHeader() {
    if (document.documentElement.dataset.headerLoaded === "1") return;
    document.documentElement.dataset.headerLoaded = "1";

    try {
      const res = await fetch("header.html", { cache: "no-store" });
      const html = await res.text();
      document.body.insertAdjacentHTML("afterbegin", html);

      // nav active
      const page = location.pathname.split("/").pop() || "index.html";
      const navKey = page.replace(".html", "");
      const navLink = document.querySelector(`.nav-row a[data-nav="${navKey}"]`);
      if (navLink) navLink.classList.add("active");

      // icon active（常駐功能頁）
      const iconMap = { "search.html": "search", "cart.html": "cart", "member.html": "member" };
      const iconKey = iconMap[page];
      if (iconKey) {
        const icon = document.querySelector(`.icon-row a[data-icon="${iconKey}"]`);
        if (icon) icon.classList.add("active");
      }

      ensureCartBadgeNode();
      ensureCartDrawerNode();
      bindCartIconOpen();

    } catch (e) {
      console.warn("loadHeader failed:", e);
    }
  }

  function ensureCartBadgeNode() {
    if (document.getElementById("cartCount")) return;
    const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!cartA) return;

    const span = document.createElement("span");
    span.id = "cartCount";
    span.className = "cart-badge";
    span.style.display = "none";
    cartA.appendChild(span);
  }

  function renderCartBadge() {
    const el = document.getElementById("cartCount");
    if (!el) return;

    const n = cartCount();
    if (n > 0) {
      el.textContent = String(n);
      el.style.display = "inline-flex";
      el.classList.add("cart-badge");
    } else {
      el.textContent = "";
      el.style.display = "none";
    }
  }

  // ===== Drawer DOM =====
  function ensureCartDrawerNode() {
    if (document.getElementById("cartDrawer")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div class="drawer-backdrop" id="cartDrawerBackdrop" aria-hidden="true"></div>

      <aside class="drawer" id="cartDrawer" aria-hidden="true">
        <div class="d-hd">
          <div class="d-title">購物車</div>
          <button class="ui-close" id="cartDrawerClose" type="button" aria-label="關閉">×</button>
        </div>

        <div class="d-bd">
          <div id="cartPromoTips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"></div>
          <div class="d-items" id="cartItems"></div>

          <div id="cartToast" class="pd-toast" style="display:none;margin-top:10px;">已更新 ✅</div>
        </div>

        <div class="d-ft">
          <div class="d-sumrow"><span>小計</span><strong id="cartSumSubtotal">NT$ 0</strong></div>
          <div class="d-sumrow"><span>折扣</span><strong id="cartSumDiscount">- NT$ 0</strong></div>
          <div class="d-sumrow"><span>運費</span><strong id="cartSumShipping">NT$ 0</strong></div>
          <div class="d-sumrow d-total"><span>合計</span><strong id="cartSumTotal">NT$ 0</strong></div>

          <div style="height:1px;background:rgba(0,0,0,.06);margin:10px 0;"></div>

          <div class="coupon" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <input id="drawerCouponCode" placeholder="輸入優惠碼（例如 HELLO）" autocomplete="off"
              style="flex:1;min-width:180px;padding:10px 10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.85);outline:none;text-transform:uppercase">
            <button class="d-actions secondary" id="drawerApplyCoupon" type="button"
              style="flex:0 0 auto;padding:10px 12px;border-radius:999px;border:none;background:rgba(0,0,0,.08);cursor:pointer">
              套用
            </button>
          </div>
          <div id="drawerCouponToast" class="toast" style="margin-top:8px;font-size:.9rem;"></div>

          <div class="d-actions" style="margin-top:10px;display:flex;gap:10px;">
            <button class="secondary" id="drawerClearCart" type="button">清空</button>
            <button class="primary" id="drawerCheckout" type="button">結帳</button>
          </div>
        </div>
      </aside>
    `);

    // 綁關閉
    document.getElementById("cartDrawerClose")?.addEventListener("click", closeDrawer);
    document.getElementById("cartDrawerBackdrop")?.addEventListener("click", closeDrawer);

    // 綁清空
    document.getElementById("drawerClearCart")?.addEventListener("click", () => {
      if (!confirm("確定要清空購物車嗎？")) return;
      writeCart([]);
      window.TEN_APPLIED = { code: "", discount: 0, note: "" };
      const inp = document.getElementById("drawerCouponCode");
      if (inp) inp.value = "";
      renderDrawer();
    });

    // 綁套用優惠碼
    document.getElementById("drawerApplyCoupon")?.addEventListener("click", applyCouponFromDrawer);
    document.getElementById("drawerCouponCode")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyCouponFromDrawer();
    });

    // 綁結帳（示意）
    document.getElementById("drawerCheckout")?.addEventListener("click", checkoutFromDrawer);

    // 事件委派：+/-/刪除/改 qty
    document.getElementById("cartItems")?.addEventListener("click", (e) => {
      const incBtn = e.target.closest("[data-inc]");
      const decBtn = e.target.closest("[data-dec]");
      const delBtn = e.target.closest("[data-del]");

      if (incBtn) return changeQty(incBtn.getAttribute("data-inc"), +1);
      if (decBtn) return changeQty(decBtn.getAttribute("data-dec"), -1);
      if (delBtn) return removeItem(delBtn.getAttribute("data-del"));
    });

    document.getElementById("cartItems")?.addEventListener("change", (e) => {
      const inp = e.target.closest("[data-qty]");
      if (!inp) return;
      setQty(inp.getAttribute("data-qty"), inp.value);
    });
  }

  function openDrawer() {
    const bd = document.getElementById("cartDrawerBackdrop");
    const dr = document.getElementById("cartDrawer");
    if (!bd || !dr) return;

    bd.classList.add("open");
    dr.classList.add("open");
    bd.setAttribute("aria-hidden", "false");
    dr.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // 同步輸入框顯示目前 code
    const inp = document.getElementById("drawerCouponCode");
    if (inp && window.TEN_APPLIED?.code) inp.value = window.TEN_APPLIED.code;

    renderDrawer();
  }

  function closeDrawer() {
    const bd = document.getElementById("cartDrawerBackdrop");
    const dr = document.getElementById("cartDrawer");
    if (!bd || !dr) return;

    bd.classList.remove("open");
    dr.classList.remove("open");
    bd.setAttribute("aria-hidden", "true");
    dr.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function bindCartIconOpen() {
    const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!cartA) return;

    cartA.addEventListener("click", (e) => {
      e.preventDefault();
      openDrawer();
    });
  }

  // ===== settings（讓免運/折扣跟著後台改）=====
  async function loadSettings() {
    const cacheKey = "tyod_settings_cache_v1";
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const s = JSON.parse(cached);
        if (s && typeof s === "object") window.TEN_SETTINGS = { ...window.TEN_SETTINGS, ...s };
      } catch {}
    }

    try {
      const res = await fetch(`${window.API_BASE}/settings`, { cache: "no-store" });
      if (!res.ok) throw new Error("settings error " + res.status);
      const s = await res.json();
      if (s && typeof s === "object") {
        window.TEN_SETTINGS = {
          ...window.TEN_SETTINGS,
          ...s,
          shipping_fee: Number(s.shipping_fee ?? window.TEN_SETTINGS.shipping_fee),
          free_shipping_threshold: Number(s.free_shipping_threshold ?? window.TEN_SETTINGS.free_shipping_threshold),
          first_purchase_discount: Number(s.first_purchase_discount ?? window.TEN_SETTINGS.first_purchase_discount),
          birthday_discount: Number(s.birthday_discount ?? window.TEN_SETTINGS.birthday_discount),
          shipping_enabled: !!s.shipping_enabled
        };
        localStorage.setItem(cacheKey, JSON.stringify(window.TEN_SETTINGS));
      }
    } catch (e) {
      console.warn("loadSettings failed", e);
    }
  }

  // ===== 金額計算（使用 cart items 自帶 price；你目前 addToCart 會寫 price）=====
  function calcSubtotal(cart) {
    return cart.reduce((s, it) => s + Number(it.price || 0) * normalizeQty(it.qty), 0);
  }

  function calcShipping(subtotalAfterDiscount) {
    const S = window.TEN_SETTINGS || {};
    const shipOn = !!S.shipping_enabled;
    const fee = Number(S.shipping_fee || 0);
    const freeOver = Number(S.free_shipping_threshold || 0);

    if (!shipOn) return 0;
    if (freeOver > 0 && subtotalAfterDiscount >= freeOver) return 0;
    return fee;
  }

  function renderPromoTips(subtotalAfterDiscount) {
    const el = document.getElementById("cartPromoTips");
    if (!el) return;

    const S = window.TEN_SETTINGS || {};
    const chips = [];

    const shipOn = !!S.shipping_enabled;
    const fee = Number(S.shipping_fee || 0);
    const freeOver = Number(S.free_shipping_threshold || 0);

    if (shipOn) {
      if (freeOver > 0) {
        const remain = Math.max(0, freeOver - subtotalAfterDiscount);
        if (subtotalAfterDiscount >= freeOver) chips.push(`已達 NT$${freeOver} 免運 ✅`);
        else chips.push(`滿 NT$${freeOver} 免運｜還差 NT$${remain}`);
      } else {
        chips.push(`運費 NT$${fee}`);
      }
    } else {
      chips.push("免運活動中");
    }

    const firstZhe = rateToZhe(S.first_purchase_discount);
    const bdayZhe  = rateToZhe(S.birthday_discount);
    if (firstZhe) chips.push(`首購 ${firstZhe} 折`);
    if (bdayZhe) chips.push(`生日月 ${bdayZhe} 折`);

    el.innerHTML = chips.map(t => `<span class="pill">${t}</span>`).join("");
  }

  // ===== Drawer Render =====
  function itemRowHtml(it) {
    const id = String(it.id);
    const title = it.title || id;
    const img = (it.image || "").trim() || "assets/placeholder.png";
    const price = Number(it.price || 0);
    const qty = normalizeQty(it.qty);

    return `
      <div class="d-item">
        <div class="d-thumb"><img src="${img}" alt=""></div>

        <div class="d-info">
          <div class="d-name">${title}</div>
          <div class="d-meta">${money(price)}</div>
        </div>

        <div class="d-right">
          <div class="d-price">${money(price * qty)}</div>
          <div class="d-qty">
            <button type="button" data-dec="${id}" aria-label="減少">-</button>
            <input type="number" min="1" step="1" value="${qty}" data-qty="${id}">
            <button type="button" data-inc="${id}" aria-label="增加">+</button>
          </div>
          <button class="d-del" type="button" data-del="${id}">刪除</button>
        </div>
      </div>
    `;
  }

  function renderDrawer() {
    const cart = readCart();
    const itemsEl = document.getElementById("cartItems");
    if (!itemsEl) return;

    if (!cart.length) {
      itemsEl.innerHTML = `<div class="muted">購物車是空的。</div>`;
    } else {
      itemsEl.innerHTML = cart.map(itemRowHtml).join("");
    }

    const subtotal = calcSubtotal(cart);
    const applied = window.TEN_APPLIED || { discount: 0 };
    const discount = Math.min(subtotal, Math.max(0, Number(applied.discount || 0)));

    const after = Math.max(0, subtotal - discount);
    const shipping = calcShipping(after);
    const total = after + shipping;

    document.getElementById("cartSumSubtotal").textContent = money(subtotal);
    document.getElementById("cartSumDiscount").textContent = `- ${money(discount)}`;
    document.getElementById("cartSumShipping").textContent = money(shipping);
    document.getElementById("cartSumTotal").textContent = money(total);

    renderPromoTips(after);

    const checkoutBtn = document.getElementById("drawerCheckout");
    if (checkoutBtn) checkoutBtn.disabled = (subtotal <= 0);
  }

  function showDrawerToast(msg, ok = true) {
    const el = document.getElementById("cartToast");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
    setTimeout(() => { el.style.display = "none"; }, 1200);
  }

  function showCouponToast(msg, ok = true) {
    const el = document.getElementById("drawerCouponToast");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
    if (msg) setTimeout(() => { el.textContent = ""; }, 2200);
  }

  // ===== Cart operations =====
  function setQty(id, qty) {
    const cart = readCart();
    const i = cart.findIndex(x => String(x.id) === String(id));
    if (i === -1) return;
    cart[i].qty = normalizeQty(qty);
    writeCart(cart);
    renderDrawer();
    maybeRevalidateCoupon();
  }

  function changeQty(id, delta) {
    const cart = readCart();
    const i = cart.findIndex(x => String(x.id) === String(id));
    if (i === -1) return;
    cart[i].qty = normalizeQty(Number(cart[i].qty || 1) + Number(delta || 1));
    writeCart(cart);
    renderDrawer();
    maybeRevalidateCoupon();
  }

  function removeItem(id) {
    const cart = readCart().filter(x => String(x.id) !== String(id));
    writeCart(cart);
    renderDrawer();
    maybeRevalidateCoupon(true);
  }

  // ===== Coupon =====
  async function validateCoupon(code, subtotal) {
    const memberId = getMemberId();
    const url = `${GAS_URL}?path=coupon_validate`
      + `&code=${encodeURIComponent(code)}`
      + `&memberId=${encodeURIComponent(memberId)}`
      + `&subtotal=${encodeURIComponent(subtotal)}`;

    const res = await fetch(url, { cache: "no-store" });
    const out = await res.json();
    return { res, out };
  }

  function couponErrorText(err) {
    const m = {
      "CODE_REQUIRED": "請輸入優惠碼",
      "INVALID_CODE": "優惠碼不存在",
      "DISABLED": "此優惠碼已停用",
      "MIN_SPEND": "未達最低消費門檻",
      "NOT_STARTED": "優惠尚未開始",
      "EXPIRED": "優惠已過期",
      "SOLD_OUT": "優惠已用完",
      "ALREADY_USED": "你已使用過此優惠碼",
      "SERVER_ERROR": "系統忙碌，請稍後再試"
    };
    return m[String(err || "")] || `套用失敗（${err || "ERROR"}）`;
  }

  async function applyCouponFromDrawer() {
    const cart = readCart();
    const subtotal = calcSubtotal(cart);

    const inp = document.getElementById("drawerCouponCode");
    const code = String(inp?.value || "").trim().toUpperCase();

    if (!code) return showCouponToast("請輸入優惠碼", false);
    if (subtotal <= 0) return showCouponToast("購物車是空的", false);

    try {
      showCouponToast("驗證中…");
      const { out } = await validateCoupon(code, subtotal);

      if (!out || out.ok !== true) {
        window.TEN_APPLIED = { code: "", discount: 0, note: "" };
        renderDrawer();
        return showCouponToast(couponErrorText(out?.error), false);
      }

      window.TEN_APPLIED = {
        code: out.code || code,
        discount: Math.max(0, Number(out.discount || 0)),
        note: String(out.note || "")
      };

      renderDrawer();
      showCouponToast(`已套用 ${window.TEN_APPLIED.code} ✅ 折抵 ${money(window.TEN_APPLIED.discount)}`);

    } catch (e) {
      console.error(e);
      window.TEN_APPLIED = { code: "", discount: 0, note: "" };
      renderDrawer();
      showCouponToast("系統忙碌，請稍後再試", false);
    }
  }

  // 套用後改數量：自動重新驗證（避免折扣不跟著變）
  let revalidateTimer = null;
  async function maybeRevalidateCoupon(clearIfEmpty = false) {
    if (!window.TEN_APPLIED?.code) return;

    const cart = readCart();
    const subtotal = calcSubtotal(cart);

    if (subtotal <= 0) {
      if (clearIfEmpty) {
        window.TEN_APPLIED = { code: "", discount: 0, note: "" };
        const inp = document.getElementById("drawerCouponCode");
        if (inp) inp.value = "";
        showCouponToast("購物車空了，已清除優惠碼");
      }
      renderDrawer();
      return;
    }

    clearTimeout(revalidateTimer);
    revalidateTimer = setTimeout(async () => {
      try {
        const code = window.TEN_APPLIED.code;
        const { out } = await validateCoupon(code, subtotal);

        if (!out || out.ok !== true) {
          window.TEN_APPLIED = { code: "", discount: 0, note: "" };
          renderDrawer();
          showCouponToast(couponErrorText(out?.error), false);
          return;
        }

        window.TEN_APPLIED.discount = Math.max(0, Number(out.discount || 0));
        renderDrawer();
      } catch (e) {
        console.warn("revalidate failed", e);
      }
    }, 350);
  }

  // ===== Checkout（示意）=====
  async function checkoutFromDrawer() {
    const cart = readCart();
    const subtotal = calcSubtotal(cart);
    if (subtotal <= 0) return showDrawerToast("購物車是空的", false);

    const memberId = getMemberId();
    const orderId = "O-" + Date.now();

    try {
      // 有優惠碼才寫入 coupon_use
      if (window.TEN_APPLIED?.code) {
        showCouponToast("結帳中：寫入優惠碼使用紀錄…");
        const res = await fetch(`${GAS_URL}?path=coupon_use&key=${encodeURIComponent(ADMIN_KEY)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: window.TEN_APPLIED.code,
            memberId,
            subtotal,
            orderId
          })
        });
        const out = await res.json();
        if (!res.ok || !out?.ok) {
          return showCouponToast(couponErrorText(out?.error), false);
        }
        showCouponToast(`✅ 優惠碼已使用：${out.code}（折抵 ${money(out.discount)}）`);
      }

      // 清空購物車
      writeCart([]);
      window.TEN_APPLIED = { code: "", discount: 0, note: "" };
      const inp = document.getElementById("drawerCouponCode");
      if (inp) inp.value = "";

      renderDrawer();
      renderCartBadge();
      showDrawerToast("結帳完成（示意）✅");
      closeDrawer();

    } catch (e) {
      console.error(e);
      showDrawerToast("結帳失敗，請稍後再試", false);
    }
  }

  // ===== 同步監聽 =====
  function bindListeners() {
    window.addEventListener("cart:changed", () => {
      renderCartBadge();
      // 抽屜開著就同步更新
      const dr = document.getElementById("cartDrawer");
      if (dr?.classList.contains("open")) renderDrawer();
      maybeRevalidateCoupon();
    });

    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY) {
        renderCartBadge();
        const dr = document.getElementById("cartDrawer");
        if (dr?.classList.contains("open")) renderDrawer();
      }
    });
  }

  // ===== init =====
  window.addEventListener("DOMContentLoaded", async () => {
    await loadHeader();
    await loadSettings();
    renderCartBadge();
    bindListeners();
  });

})();
// =========================
// Cart Drawer: bind + render (最小可用版)
// =========================
(function () {
  const CART_KEY = (typeof window.CART_KEY === "string" && window.CART_KEY) ? window.CART_KEY : "ten_cart";

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
    window.dispatchEvent(new Event("cart:changed")); // 讓 badge + 抽屜同步更新
  }

  function money(n) {
    n = Math.round(Number(n || 0));
    return `NT$ ${n}`;
  }
  function normalizeQty(n) {
    n = Number(n || 1);
    if (!Number.isFinite(n) || n < 1) n = 1;
    return Math.floor(n);
  }

  function getEls() {
    return {
      cartA: document.querySelector('.icon-row a[data-icon="cart"]'),
      backdrop: document.getElementById("cartBackdrop"),
      drawer: document.getElementById("cartDrawer"),
      closeBtn: document.getElementById("cartClose"),

      itemsEl: document.getElementById("cartItems"),
      subtotalEl: document.getElementById("cartSubtotal"),
      discountEl: document.getElementById("cartDiscount"),
      shippingEl: document.getElementById("cartShipping"),
      totalEl: document.getElementById("cartTotal"),

      clearBtn: document.getElementById("cartClear"),
      checkoutBtn: document.getElementById("cartGoCheckout"),
    };
  }

  function openCart() {
    const { backdrop, drawer } = getEls();
    if (!backdrop || !drawer) return;
    backdrop.classList.add("open");
    drawer.classList.add("open");
    document.body.style.overflow = "hidden";
    renderCart();
  }

  function closeCart() {
    const { backdrop, drawer } = getEls();
    if (!backdrop || !drawer) return;
    backdrop.classList.remove("open");
    drawer.classList.remove("open");
    document.body.style.overflow = "";
  }

  function cartRow(it) {
    const id = String(it.id);
    const title = it.title || id;
    const img = it.image || "assets/placeholder.png";
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

          <div class="d-qty">
            <button type="button" data-dec="${id}">-</button>
            <input type="number" min="1" value="${qty}" data-qty="${id}">
            <button type="button" data-inc="${id}">+</button>
          </div>

          <button class="d-del" type="button" data-del="${id}">刪除</button>
        </div>
      </div>
    `;
  }

  function renderCart() {
    const { itemsEl, subtotalEl, discountEl, shippingEl, totalEl, checkoutBtn } = getEls();
    if (!itemsEl) return;

    const cart = readCart();

    if (!cart.length) {
      itemsEl.innerHTML = `<div style="opacity:.75;">購物車目前是空的。</div>`;
      if (subtotalEl) subtotalEl.textContent = money(0);
      if (discountEl) discountEl.textContent = `- ${money(0)}`;
      if (shippingEl) shippingEl.textContent = money(0);
      if (totalEl) totalEl.textContent = money(0);
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    itemsEl.innerHTML = cart.map(cartRow).join("");

    // 綁定事件
    itemsEl.querySelectorAll("[data-inc]").forEach(btn => {
      btn.addEventListener("click", () => changeQty(btn.getAttribute("data-inc"), +1));
    });
    itemsEl.querySelectorAll("[data-dec]").forEach(btn => {
      btn.addEventListener("click", () => changeQty(btn.getAttribute("data-dec"), -1));
    });
    itemsEl.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => removeItem(btn.getAttribute("data-del")));
    });
    itemsEl.querySelectorAll("[data-qty]").forEach(inp => {
      inp.addEventListener("change", () => setQty(inp.getAttribute("data-qty"), inp.value));
    });

    const subtotal = cart.reduce((s, it) => s + Number(it.price || 0) * normalizeQty(it.qty), 0);
    const discount = 0; // 先保留 0（下一步再接優惠碼/折扣）
    const shipping = 0; // 先保留 0（下一步接 settings 做免運判斷）
    const total = Math.max(0, subtotal - discount) + shipping;

    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (discountEl) discountEl.textContent = `- ${money(discount)}`;
    if (shippingEl) shippingEl.textContent = money(shipping);
    if (totalEl) totalEl.textContent = money(total);
    const { checkoutBtn } = getEls();
    if (checkoutBtn) checkoutBtn.disabled = false;
  }

  function setQty(id, qty) {
    const cart = readCart();
    const i = cart.findIndex(x => String(x.id) === String(id));
    if (i === -1) return;
    cart[i].qty = normalizeQty(qty);
    writeCart(cart);
    renderCart();
  }

  function changeQty(id, delta) {
    const cart = readCart();
    const i = cart.findIndex(x => String(x.id) === String(id));
    if (i === -1) return;
    cart[i].qty = normalizeQty(Number(cart[i].qty || 1) + Number(delta || 1));
    writeCart(cart);
    renderCart();
  }

  function removeItem(id) {
    const cart = readCart().filter(x => String(x.id) !== String(id));
    writeCart(cart);
    renderCart();
  }

  function bindCartDrawer() {
    const { cartA, backdrop, closeBtn, clearBtn } = getEls();
    if (cartA) {
      cartA.addEventListener("click", (e) => {
        // 攔截原本跳 cart.html，改成開抽屜
        e.preventDefault();
        openCart();
      });
    }
    if (closeBtn) closeBtn.addEventListener("click", closeCart);
    if (backdrop) backdrop.addEventListener("click", closeCart);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCart();
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (confirm("確定要清空購物車嗎？")) {
          writeCart([]);
          renderCart();
        }
      });
    }

    // 外部寫入購物車時（例如商品頁 addToCart 後）同步刷新抽屜
    window.addEventListener("cart:changed", () => {
      const { drawer } = getEls();
      if (drawer && drawer.classList.contains("open")) renderCart();
    });

    // 首次畫一次（不開抽屜也能先算好）
    renderCart();
  }

  // include.js 會插入 header.html，所以要等 DOM + header 插完再綁
  window.addEventListener("DOMContentLoaded", () => {
    // 延後一拍，確保 header.html 已 insertAdjacentHTML 完成
    setTimeout(bindCartDrawer, 0);
  });
})();
