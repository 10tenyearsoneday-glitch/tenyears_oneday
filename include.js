// include.js (FINAL Clean A++ Orders)
// - header.html 內含：header + nav + cart drawer/backdrop + checkout modal DOM
// - include.js 負責：插入 header、active 狀態、badge、抽屜互動、優惠碼（驗證/重驗證）、結帳表單 + 寫入 orders（GAS order_create）

(() => {
  if (window.TEN_INCLUDE_LOADED) return;
  window.TEN_INCLUDE_LOADED = true;

  // ===== 全域設定 =====
  window.API_BASE = window.API_BASE || "https://tenyears-oneday-api.onrender.com";

  const CART_KEY = "ten_cart";
  const MEMBER_KEY = "ten_member_id";

  const GAS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  // ⚠️ 注意：放在前端一定會曝光（任何人都能看到）
  // 目前先沿用你現況；正式上線金流前，務必改成「伺服器端呼叫 GAS」或改用 API server 代理。
  const ADMIN_KEY = "10years1day911321";

  window.TEN_SETTINGS = window.TEN_SETTINGS || {
    shipping_enabled: true,
    shipping_fee: 60,
    free_shipping_threshold: 1000,
    first_purchase_discount: 0.9,
    birthday_discount: 0.85,
  };

  // 已套用優惠碼狀態
  window.TEN_APPLIED = window.TEN_APPLIED || { code: "", discount: 0, note: "" };

  // （可選）如果你想讓 drawer 在 cart item 只有 {id, qty} 的情況也能顯示正確價格/圖：
  // 你可以在其他頁先把商品 index 放到 window.TEN_PRODUCTS_BY_ID
  // window.TEN_PRODUCTS_BY_ID = { "O-D": {id,title,price,image...}, ... }

  // ===== 小工具 =====
  function $(id) {
    return document.getElementById(id);
  }

  function normalizeQty(n) {
    n = Number(n || 1);
    if (!Number.isFinite(n) || n < 1) n = 1;
    return Math.floor(n);
  }

  function money(n) {
    n = Math.round(Number(n || 0));
    return `NT$ ${n}`;
  }

  function rateToZhe(rate) {
    rate = Number(rate || 1);
    if (rate >= 1 || rate <= 0) return null;
    const z = Math.round(rate * 100) / 10;
    return String(z).replace(/\.0$/, "");
  }

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
    return readCart().reduce((s, it) => s + normalizeQty(it.qty), 0);
  }

  // ===== Header 插入 + Active 狀態 =====
  async function loadHeader() {
    if (document.documentElement.dataset.headerLoaded === "1") return;
    document.documentElement.dataset.headerLoaded = "1";

    try {
      const res = await fetch("./header.html", { cache: "no-store" });
      if (!res.ok) throw new Error(`header fetch ${res.status}`);
      const html = await res.text();

      document.body.insertAdjacentHTML("afterbegin", html);

      // nav active
      const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
      const navKey = page.replace(".html", "");
      const navLink = document.querySelector(`.nav-row a[data-nav="${navKey}"]`);
      if (navLink) navLink.classList.add("active");

      // icon active
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
      bindCheckoutModalClose(); // ✅ 新增：結帳 modal 關閉

    } catch (e) {
      console.warn("loadHeader failed:", e);
    }
  }

  function ensureCartBadgeNode() {
    if ($("cartCount")) return;
    const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!cartA) return;

    const span = document.createElement("span");
    span.id = "cartCount";
    span.className = "cart-badge";
    span.style.display = "none";
    cartA.appendChild(span);
  }

  // ===== Drawer open/close（支援 hidden + aria-hidden + ESC）=====
  function openDrawer() {
    const bd = $("cartBackdrop");
    const dr = $("cartDrawer");
    if (!bd || !dr) return;

    bd.hidden = false;
    dr.hidden = false;

    bd.classList.add("open");
    dr.classList.add("open");

    bd.setAttribute("aria-hidden", "false");
    dr.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    // 同步優惠碼輸入框（如果 header.html 有）
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

    bd.setAttribute("aria-hidden", "true");
    dr.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";

    setTimeout(() => {
      bd.hidden = true;
      dr.hidden = true;
    }, 220);
  }

  function bindDrawerClose() {
    if (window.TEN_DRAWER_CLOSE_BOUND) return;
    window.TEN_DRAWER_CLOSE_BOUND = true;

    const closeBtn = $("cartClose");
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

    const bd = $("cartBackdrop");
    if (bd) bd.addEventListener("click", closeDrawer);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // 若結帳 modal 開著：先關 modal；不然關 drawer
        const ck = $("ckBackdrop");
        if (ck && !ck.hidden && ck.classList.contains("open")) closeCheckoutModal();
        else closeDrawer();
      }
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

  // ===== badge =====
  function renderCartBadge() {
    const el = $("cartCount");
    if (!el) return;

    const n = cartCount();
    if (n > 0) {
      el.textContent = String(n);
      el.style.display = "inline-flex";
      el.classList.add("cart-badge");
      el.hidden = false;
    } else {
      el.textContent = "";
      el.style.display = "none";
      el.hidden = true;
    }
  }

  // ===== settings =====
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
          free_shipping_threshold: Number(
            s.free_shipping_threshold ?? window.TEN_SETTINGS.free_shipping_threshold
          ),
          first_purchase_discount: Number(
            s.first_purchase_discount ?? window.TEN_SETTINGS.first_purchase_discount
          ),
          birthday_discount: Number(s.birthday_discount ?? window.TEN_SETTINGS.birthday_discount),
          shipping_enabled: !!s.shipping_enabled,
        };
        localStorage.setItem(cacheKey, JSON.stringify(window.TEN_SETTINGS));
      }
    } catch (e) {
      console.warn("loadSettings failed", e);
    }
  }

  // ===== 計算 =====
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
    const el = $("cartPromoTips");
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
    const bdayZhe = rateToZhe(S.birthday_discount);
    if (firstZhe) chips.push(`首購 ${firstZhe} 折`);
    if (bdayZhe) chips.push(`生日月 ${bdayZhe} 折`);

    el.innerHTML = chips.map((t) => `<span class="pill">${t}</span>`).join("");
  }

  // ===== Drawer render =====
  function hydrateCartItem(it) {
    const id = String(it?.id ?? "");
    const base = (window.TEN_PRODUCTS_BY_ID && window.TEN_PRODUCTS_BY_ID[id]) || null;

    return {
      id,
      qty: normalizeQty(it?.qty),
      title: it?.title ?? base?.title ?? id,
      price: Number(it?.price ?? base?.price ?? 0),
      image: it?.image ?? base?.image ?? "assets/placeholder.png",
    };
  }

  function cartHydrated() {
    return readCart().map(hydrateCartItem);
  }

  function calcSubtotalFromHydrated(items) {
    return items.reduce((s, it) => s + Number(it.price || 0) * normalizeQty(it.qty), 0);
  }

  function itemRowHtml(raw) {
    const it = hydrateCartItem(raw);

    return `
      <div class="d-item">
        <div class="d-thumb"><img src="${it.image}" alt=""></div>

        <div class="d-info">
          <div class="d-name">${it.title}</div>
          <div class="d-meta">${money(it.price)}</div>
        </div>

        <div class="d-right">
          <div class="d-price">${money(it.price * it.qty)}</div>
          <div class="d-qty">
            <button type="button" data-dec="${it.id}" aria-label="減少">-</button>
            <input type="number" min="1" step="1" value="${it.qty}" data-qty="${it.id}">
            <button type="button" data-inc="${it.id}" aria-label="增加">+</button>
          </div>
          <button class="d-del" type="button" data-del="${it.id}">刪除</button>
        </div>
      </div>
    `;
  }

  function renderDrawer() {
    const cart = readCart();
    const itemsEl = $("cartItems");
    if (!itemsEl) return;

    if (!cart.length) itemsEl.innerHTML = `<div class="muted">購物車是空的。</div>`;
    else itemsEl.innerHTML = cart.map(itemRowHtml).join("");

    const hydrated = cartHydrated();
    const subtotal = calcSubtotalFromHydrated(hydrated);

    const applied = window.TEN_APPLIED || { discount: 0 };
    const discount = Math.min(subtotal, Math.max(0, Number(applied.discount || 0)));

    const after = Math.max(0, subtotal - discount);
    const shipping = calcShipping(after);
    const total = after + shipping;

    const subEl = $("cartSubtotal");
    if (subEl) subEl.textContent = money(subtotal);

    const disEl = $("cartDiscount");
    if (disEl) disEl.textContent = `- ${money(discount)}`;

    const shipEl = $("cartShipping");
    if (shipEl) shipEl.textContent = money(shipping);

    const totalEl = $("cartTotal");
    if (totalEl) totalEl.textContent = money(total);

    renderPromoTips(after);

    const checkoutBtn = $("cartGoCheckout");
    if (checkoutBtn) checkoutBtn.disabled = subtotal <= 0;
  }

  function showDrawerToast(msg, ok = true) {
    const el = $("cartToast");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
    setTimeout(() => (el.style.display = "none"), 1400);
  }

  function showCouponToast(msg, ok = true) {
    const el = $("drawerCouponToast");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
    if (msg) setTimeout(() => (el.textContent = ""), 2200);
  }

  // ===== Cart operations =====
  function setQty(id, qty) {
    const cart = readCart();
    const i = cart.findIndex((x) => String(x.id) === String(id));
    if (i === -1) return;
    cart[i].qty = normalizeQty(qty);
    writeCart(cart);
    renderDrawer();
    maybeRevalidateCoupon();
  }

  function changeQty(id, delta) {
    const cart = readCart();
    const i = cart.findIndex((x) => String(x.id) === String(id));
    if (i === -1) return;
    cart[i].qty = normalizeQty(Number(cart[i].qty || 1) + Number(delta || 1));
    writeCart(cart);
    renderDrawer();
    maybeRevalidateCoupon();
  }

  function removeItem(id) {
    const cart = readCart().filter((x) => String(x.id) !== String(id));
    writeCart(cart);
    renderDrawer();
    maybeRevalidateCoupon(true);
  }

  // ===== Coupon =====
  async function validateCoupon(code, subtotal) {
    const memberId = getMemberId();
    const url =
      `${GAS_URL}?path=coupon_validate` +
      `&code=${encodeURIComponent(code)}` +
      `&memberId=${encodeURIComponent(memberId)}` +
      `&subtotal=${encodeURIComponent(subtotal)}`;

    const res = await fetch(url, { cache: "no-store" });
    const out = await res.json();
    return { out };
  }

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
      MEMBER_REQUIRED: "會員資料不足",
      SUBTOTAL_REQUIRED: "小計不足以套用",
      SERVER_ERROR: "系統忙碌，請稍後再試",
      UNAUTHORIZED: "沒有權限（ADMIN_KEY）",
    };
    return m[String(err || "")] || `套用失敗（${err || "ERROR"}）`;
  }

  async function applyCouponFromDrawer() {
    const cart = cartHydrated();
    const subtotal = calcSubtotalFromHydrated(cart);

    const inp = $("drawerCouponCode");
    const code = String(inp ? inp.value : "").trim().toUpperCase();

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
        note: String(out.note || ""),
      };

      renderDrawer();
      showCouponToast(
        `已套用 ${window.TEN_APPLIED.code} ✅ 折抵 ${money(window.TEN_APPLIED.discount)}`
      );
    } catch (e) {
      console.error(e);
      window.TEN_APPLIED = { code: "", discount: 0, note: "" };
      renderDrawer();
      showCouponToast("系統忙碌，請稍後再試", false);
    }
  }

  let revalidateTimer = null;
  function maybeRevalidateCoupon(clearIfEmpty = false) {
    if (!window.TEN_APPLIED?.code) return;

    const cart = cartHydrated();
    const subtotal = calcSubtotalFromHydrated(cart);

    if (subtotal <= 0) {
      if (clearIfEmpty) {
        window.TEN_APPLIED = { code: "", discount: 0, note: "" };
        const inp = $("drawerCouponCode");
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

  // =========================
  // ✅ Checkout Modal + Orders
  // =========================
  const CHECKOUT_FORM_KEY = "ten_checkout_form_v1";

  function bindCheckoutModalClose() {
    if (window.TEN_CHECKOUT_CLOSE_BOUND) return;
    window.TEN_CHECKOUT_CLOSE_BOUND = true;

    const closeBtn = $("ckClose");
    if (closeBtn) closeBtn.addEventListener("click", closeCheckoutModal);

    const bd = $("ckBackdrop");
    if (bd) {
      bd.addEventListener("click", (e) => {
        if (e.target === bd) closeCheckoutModal();
      });
    }
  }

  function openCheckoutModal() {
    const bd = $("ckBackdrop");
    const wrap = $("ckWrap");
    if (!bd || !wrap) {
      showDrawerToast("找不到結帳視窗 DOM（ckBackdrop/ckWrap）", false);
      return;
    }

    bd.hidden = false;
    bd.classList.add("open");
    bd.setAttribute("aria-hidden", "false");

    // 保持鎖定捲動（如果 drawer 開著也同樣鎖）
    document.body.style.overflow = "hidden";

    renderCheckoutForm();
  }

  function closeCheckoutModal() {
    const bd = $("ckBackdrop");
    if (!bd) return;

    bd.classList.remove("open");
    bd.setAttribute("aria-hidden", "true");

    // 如果 drawer 還開著，body 仍要鎖；否則解除
    const dr = $("cartDrawer");
    const drawerOpen = dr && dr.classList.contains("open");
    document.body.style.overflow = drawerOpen ? "hidden" : "";

    setTimeout(() => {
      bd.hidden = true;
    }, 220);
  }

  function loadCheckoutDraft() {
    try {
      return JSON.parse(localStorage.getItem(CHECKOUT_FORM_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveCheckoutDraft(obj) {
    try {
      localStorage.setItem(CHECKOUT_FORM_KEY, JSON.stringify(obj || {}));
    } catch {}
  }

  function renderCheckoutForm() {
    const wrap = $("ckWrap");
    if (!wrap) return;

    const cart = cartHydrated();
    const subtotal = calcSubtotalFromHydrated(cart);
    if (subtotal <= 0) {
      wrap.innerHTML = `<div class="muted">購物車是空的。</div>`;
      return;
    }

    const applied = window.TEN_APPLIED || { code: "", discount: 0 };
    const discount = Math.min(subtotal, Math.max(0, Number(applied.discount || 0)));
    const after = Math.max(0, subtotal - discount);
    const shippingFee = calcShipping(after);
    const total = after + shippingFee;

    const draft = loadCheckoutDraft();

    // shipping_method：宅配 / 7-11 / 全家（你可自行改字）
    const shippingMethod = String(draft.shipping_method || "宅配");

    wrap.innerHTML = `
      <div style="display:grid;gap:12px; padding: 6px;">
        <div style="background:rgba(255,255,255,.70);border:1px solid rgba(0,0,0,.06);border-radius:16px;padding:12px;">
          <div style="font-weight:900;letter-spacing:.04em;margin-bottom:10px;">收件資料</div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="grid-column:1/-1;">
              <div style="font-size:.82rem;opacity:.75;margin:2px 0 6px;">姓名 *</div>
              <input id="ck_name" value="${escapeHtml_(draft.name || "")}"
                style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;">
            </div>

            <div>
              <div style="font-size:.82rem;opacity:.75;margin:2px 0 6px;">手機 *</div>
              <input id="ck_phone" value="${escapeHtml_(draft.phone || "")}" inputmode="tel"
                style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;">
            </div>

            <div>
              <div style="font-size:.82rem;opacity:.75;margin:2px 0 6px;">Email</div>
              <input id="ck_email" value="${escapeHtml_(draft.email || "")}" inputmode="email"
                style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;">
            </div>

            <div style="grid-column:1/-1;">
              <div style="font-size:.82rem;opacity:.75;margin:2px 0 6px;">配送方式 *</div>
              <select id="ck_shipping_method"
                style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;">
                <option value="宅配" ${shippingMethod === "宅配" ? "selected" : ""}>宅配</option>
                <option value="7-11" ${shippingMethod === "7-11" ? "selected" : ""}>7-11（門市）</option>
                <option value="全家" ${shippingMethod === "全家" ? "selected" : ""}>全家（門市）</option>
              </select>
            </div>

            <div style="grid-column:1/-1;">
              <div style="font-size:.82rem;opacity:.75;margin:2px 0 6px;">地址 / 門市 *</div>
              <input id="ck_address" value="${escapeHtml_(draft.address_or_store || "")}"
                placeholder="宅配：完整地址｜超商：門市名稱/店號"
                style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;">
            </div>

            <div style="grid-column:1/-1;">
              <div style="font-size:.82rem;opacity:.75;margin:2px 0 6px;">備註</div>
              <textarea id="ck_note"
                style="width:100%;min-height:86px;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;resize:vertical;">${escapeHtml_(draft.note || "")}</textarea>
            </div>
          </div>
        </div>

        <div style="background:rgba(255,255,255,.70);border:1px solid rgba(0,0,0,.06);border-radius:16px;padding:12px;">
          <div style="font-weight:900;letter-spacing:.04em;margin-bottom:10px;">訂單摘要</div>
          <div style="display:flex;justify-content:space-between;margin:6px 0;"><span>小計</span><strong>${money(subtotal)}</strong></div>
          <div style="display:flex;justify-content:space-between;margin:6px 0;"><span>折扣</span><strong>- ${money(discount)}</strong></div>
          <div style="display:flex;justify-content:space-between;margin:6px 0;"><span>運費</span><strong>${money(shippingFee)}</strong></div>
          <div style="height:1px;background:rgba(0,0,0,.06);margin:10px 0;"></div>
          <div style="display:flex;justify-content:space-between;margin:6px 0;font-size:1.05rem;"><span>合計</span><strong>${money(total)}</strong></div>

          <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">
            <button id="ck_submit" type="button"
              style="flex:1;border:none;border-radius:16px;padding:14px 12px;cursor:pointer;background:#5d6b59;color:#fff;font-weight:900;letter-spacing:.08em;">
              送出訂單
            </button>
            <button id="ck_cancel" type="button"
              style="flex:0 0 auto;border:none;border-radius:16px;padding:14px 12px;cursor:pointer;background:rgba(0,0,0,.08);color:rgba(47,58,44,.9);font-weight:800;">
              取消
            </button>
          </div>

          <div id="ck_toast" style="margin-top:10px;font-size:.9rem;opacity:.9;"></div>
        </div>
      </div>
    `;

    // bind
    const cancelBtn = $("ck_cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", closeCheckoutModal);

    const submitBtn = $("ck_submit");
    if (submitBtn) submitBtn.addEventListener("click", submitOrderFromModal);
  }

  function setCheckoutToast(msg, ok = true) {
    const el = $("ck_toast");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
  }

  function escapeHtml_(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function buildOrderPayload_() {
    const cart = cartHydrated();
    const subtotal = calcSubtotalFromHydrated(cart);

    const applied = window.TEN_APPLIED || { code: "", discount: 0 };
    const discount = Math.min(subtotal, Math.max(0, Number(applied.discount || 0)));
    const after = Math.max(0, subtotal - discount);
    const shippingFee = calcShipping(after);
    const total = after + shippingFee;

    const memberId = getMemberId();

    const name = String($("ck_name")?.value || "").trim();
    const phone = String($("ck_phone")?.value || "").trim();
    const email = String($("ck_email")?.value || "").trim();
    const shippingMethod = String($("ck_shipping_method")?.value || "宅配").trim();
    const addressOrStore = String($("ck_address")?.value || "").trim();
    const note = String($("ck_note")?.value || "").trim();

    // 存草稿（下次開還在）
    saveCheckoutDraft({
      name,
      phone,
      email,
      shipping_method: shippingMethod,
      address_or_store: addressOrStore,
      note,
    });

    // ⚠️ 注意：你的 GAS order_create 支援 items 是 array 或 string
    // 我們傳 array（GAS 會 JSON.stringify）
    const orderId = "O-" + Date.now();

    return {
      orderId,
      memberId,
      name,
      phone,
      email,
      shippingMethod,
      addressOrStore,
      note,
      items: cart,              // array
      subtotal,
      shippingFee,
      couponCode: String(applied.code || "").trim().toUpperCase(),
      // discount/total 不由前端決定（後端會重算），但我們仍可送過去做對帳（後端目前不吃也沒關係）
      discount,
      total,
    };
  }

  function orderErrorText(err) {
    const m = {
      MEMBER_REQUIRED: "會員資料不足",
      NAME_REQUIRED: "請填姓名",
      PHONE_REQUIRED: "請填手機",
      ADDRESS_REQUIRED: "請填地址 / 門市",
      SUBTOTAL_REQUIRED: "小計不足",
      BAD_ORDERS_HEADERS: "orders 表欄位不正確",
      UNAUTHORIZED: "沒有權限（ADMIN_KEY）",
      SERVER_ERROR: "系統忙碌，請稍後再試",
      EMPTY_CART: "購物車是空的",
      TOTAL_REQUIRED: "總金額錯誤",
      INVALID_CODE: "優惠碼不存在或不可用",
      ALREADY_USED: "你已使用過此優惠碼",
      SOLD_OUT: "優惠已用完",
      EXPIRED: "優惠已過期",
    };
    return m[String(err || "")] || `下單失敗（${err || "ERROR"}）`;
  }

  async function submitOrderFromModal() {
    const btn = $("ck_submit");
    if (btn) btn.disabled = true;

    try {
      const payload = buildOrderPayload_();

      // 前端先做必填檢查（少打一次 API）
      if (!payload.name) return setCheckoutToast("請填姓名", false);
      if (!payload.phone) return setCheckoutToast("請填手機", false);
      if (!payload.addressOrStore) return setCheckoutToast("請填地址 / 門市", false);
      if (!(payload.subtotal > 0)) return setCheckoutToast("購物車是空的", false);

      setCheckoutToast("送出中…");

      const res = await fetch(`${GAS_URL}?path=order_create&key=${encodeURIComponent(ADMIN_KEY)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const out = await res.json().catch(() => null);

      if (!res.ok || !out || out.ok !== true) {
        setCheckoutToast(orderErrorText(out?.error || "SERVER_ERROR"), false);
        if (btn) btn.disabled = false;
        return;
      }

      // ✅ 成功：清空購物車 + 清掉優惠碼
      writeCart([]);
      window.TEN_APPLIED = { code: "", discount: 0, note: "" };
      const inp = $("drawerCouponCode");
      if (inp) inp.value = "";

      renderDrawer();
      renderCartBadge();

      setCheckoutToast(`✅ 訂單已建立：${out.orderId || payload.orderId}`);
      // 關閉 modal + drawer
      setTimeout(() => {
        closeCheckoutModal();
        closeDrawer();
      }, 650);

    } catch (e) {
      console.error(e);
      setCheckoutToast("系統忙碌，請稍後再試", false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ===== Checkout（改為打開表單 modal）=====
  function checkoutFromDrawer() {
    const cart = cartHydrated();
    const subtotal = calcSubtotalFromHydrated(cart);
    if (subtotal <= 0) return showDrawerToast("購物車是空的", false);

    openCheckoutModal();
  }

  // ===== Drawer 事件綁定 =====
  function bindDrawerActions() {
    if (window.TEN_DRAWER_ACTIONS_BOUND) return;
    window.TEN_DRAWER_ACTIONS_BOUND = true;

    const clearBtn = $("cartClear");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (!confirm("確定要清空購物車嗎？")) return;
        writeCart([]);
        window.TEN_APPLIED = { code: "", discount: 0, note: "" };
        const inp = $("drawerCouponCode");
        if (inp) inp.value = "";
        renderDrawer();
        renderCartBadge();
      });
    }

    const applyBtn = $("drawerApplyCoupon");
    if (applyBtn) applyBtn.addEventListener("click", applyCouponFromDrawer);

    const couponInp = $("drawerCouponCode");
    if (couponInp) {
      couponInp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") applyCouponFromDrawer();
      });
    }

    const checkoutBtn = $("cartGoCheckout");
    if (checkoutBtn) checkoutBtn.addEventListener("click", checkoutFromDrawer);

    const items = $("cartItems");
    if (items) {
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

  // ===== 同步監聽 =====
  function bindListeners() {
    if (window.TEN_LISTENERS_BOUND) return;
    window.TEN_LISTENERS_BOUND = true;

    window.addEventListener("cart:changed", () => {
      renderCartBadge();
      const dr = $("cartDrawer");
      if (dr && dr.classList.contains("open")) renderDrawer();
      maybeRevalidateCoupon();
    });

    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY) {
        renderCartBadge();
        const dr = $("cartDrawer");
        if (dr && dr.classList.contains("open")) renderDrawer();
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
