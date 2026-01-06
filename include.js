// include.js (FINAL Checkout Order_Create)
// - header.html 內含：header + nav + cart drawer/backdrop + checkout modal DOM
// - include.js 負責：插入 header、active 狀態、badge、抽屜互動、優惠碼、結帳表單、寫入 GAS orders

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
  // 目前先沿用你現況；正式上線金流前，建議改成「伺服器端代理」。
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

  // 可選：若 cart 只存 {id, qty}，可用 window.TEN_PRODUCTS_BY_ID 補資料
  // window.TEN_PRODUCTS_BY_ID = { "1": {id,title,price,image...}, ... }

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
      bindCheckoutModalClose();

    } catch (e) {
      console.warn("loadHeader failed:", e);
    }
  }

  function ensureCartBadgeNode() {
    const badge = $("cartCount");
    if (!badge) return; // 你 header.html 內已經有了就不用補
    // 若你 header.html 沒有 badge（某些頁可能舊版），可自行加 ensure 邏輯
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

    // 同步優惠碼輸入框
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
        // ESC 先關 checkout modal，再關 drawer
        if (isCheckoutOpen()) closeCheckoutModal();
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
      el.hidden = false;
      el.style.display = "inline-flex";
      el.classList.add("cart-badge");
    } else {
      el.textContent = "";
      el.hidden = true;
      el.style.display = "none";
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

  function getHydratedCartAndSubtotal() {
    const cart = readCart().map(hydrateCartItem);
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
    return { cart, subtotal };
  }

  function renderDrawer() {
    const cart = readCart();
    const itemsEl = $("cartItems");
    if (!itemsEl) return;

    if (!cart.length) itemsEl.innerHTML = `<div class="muted">購物車是空的。</div>`;
    else itemsEl.innerHTML = cart.map(itemRowHtml).join("");

    const { cart: hydrated, subtotal } = getHydratedCartAndSubtotal();

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
      SERVER_ERROR: "系統忙碌，請稍後再試",
      UNAUTHORIZED: "沒有權限（ADMIN_KEY）",
    };
    return m[String(err || "")] || `套用失敗（${err || "ERROR"}）`;
  }

  async function applyCouponFromDrawer() {
    const { cart, subtotal } = getHydratedCartAndSubtotal();

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

    const { subtotal } = getHydratedCartAndSubtotal();

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

  // ==========================================================
  // ✅ Checkout Modal（表單 + 寫入 orders：GAS path=order_create）
  // ==========================================================

  function isCheckoutOpen() {
    const bd = $("ckBackdrop");
    return !!bd && bd.hidden === false && bd.getAttribute("aria-hidden") === "false";
  }

  function openCheckoutModal() {
    const bd = $("ckBackdrop");
    const wrap = $("ckWrap");
    if (!bd || !wrap) return;

    // 先渲染表單
    wrap.innerHTML = buildCheckoutFormHtml();

    // 顯示 modal
    bd.hidden = false;
    bd.classList.add("open"); // 如果你 CSS 沒用到也沒關係
    bd.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // 綁定事件
    bindCheckoutFormEvents();

    // 初始刷新一次金額
    refreshCheckoutSummary();
  }

  function closeCheckoutModal() {
    const bd = $("ckBackdrop");
    const wrap = $("ckWrap");
    if (!bd) return;

    bd.setAttribute("aria-hidden", "true");
    bd.classList.remove("open");
    bd.hidden = true;

    // 如果 drawer 還開著，就不要把 overflow 清掉（避免背景可滾）
    const dr = $("cartDrawer");
    const drawerOpen = !!dr && dr.classList.contains("open") && dr.hidden === false;
    if (!drawerOpen) document.body.style.overflow = "";

    if (wrap) wrap.innerHTML = "";
  }

  function bindCheckoutModalClose() {
    if (window.TEN_CK_CLOSE_BOUND) return;
    window.TEN_CK_CLOSE_BOUND = true;

    const closeBtn = $("ckClose");
    if (closeBtn) closeBtn.addEventListener("click", closeCheckoutModal);

    const bd = $("ckBackdrop");
    if (bd) {
      bd.addEventListener("click", (e) => {
        // 點 backdrop 才關（點 panel 不關）
        if (e.target === bd) closeCheckoutModal();
      });
    }
  }

  function buildCheckoutFormHtml() {
    // 用你現有的視覺（pd-wrap）做簡潔卡片
    return `
      <div style="padding:6px 4px;">
        <div style="
          background:rgba(255,255,255,.85);
          border:1px solid rgba(0,0,0,.06);
          border-radius:18px;
          padding:14px;
        ">
          <div style="font-weight:900;letter-spacing:.06em;font-size:1.05rem;margin-bottom:10px;">
            訂購資料
          </div>

          <form id="ckForm" autocomplete="on">
            <div style="display:grid;gap:10px;">
              <label style="display:grid;gap:6px;">
                <span style="font-size:.9rem;opacity:.85;">姓名 *</span>
                <input id="ckName" required
                  style="padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;">
              </label>

              <label style="display:grid;gap:6px;">
                <span style="font-size:.9rem;opacity:.85;">手機 *</span>
                <input id="ckPhone" required inputmode="tel"
                  style="padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;">
              </label>

              <label style="display:grid;gap:6px;">
                <span style="font-size:.9rem;opacity:.85;">Email（選填）</span>
                <input id="ckEmail" type="email" inputmode="email"
                  style="padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;">
              </label>

              <label style="display:grid;gap:6px;">
                <span style="font-size:.9rem;opacity:.85;">配送方式 *</span>
                <select id="ckShipMethod" required
                  style="padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.92);outline:none;">
                  <option value="宅配">宅配</option>
                  <option value="超商取貨">超商取貨（先手動填門市）</option>
                </select>
              </label>

              <label style="display:grid;gap:6px;">
                <span id="ckAddrLabel" style="font-size:.9rem;opacity:.85;">地址 *</span>
                <input id="ckAddr" required
                  placeholder="例如：台北市中山區…"
                  style="padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;">
                <div id="ckAddrHint" style="font-size:.82rem;opacity:.7;line-height:1.5;">
                  宅配：填收件地址｜超商：先手動填「門市名稱/店號」
                </div>
              </label>

              <label style="display:grid;gap:6px;">
                <span style="font-size:.9rem;opacity:.85;">備註（選填）</span>
                <textarea id="ckNote" rows="3"
                  style="padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;resize:vertical;"></textarea>
              </label>

              <div style="height:1px;background:rgba(0,0,0,.06);margin:6px 0;"></div>

              <div style="display:grid;gap:8px;">
                <div style="font-weight:900;letter-spacing:.06em;">金額摘要</div>
                <div style="display:flex;justify-content:space-between;"><span>小計</span><strong id="ckSumSubtotal">NT$ 0</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>折扣</span><strong id="ckSumDiscount">- NT$ 0</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>運費</span><strong id="ckSumShipping">NT$ 0</strong></div>
                <div style="height:1px;background:rgba(0,0,0,.06);margin:6px 0;"></div>
                <div style="display:flex;justify-content:space-between;font-size:1.05rem;">
                  <span>合計</span><strong id="ckSumTotal">NT$ 0</strong>
                </div>

                <div id="ckHint" style="margin-top:6px;font-size:.88rem;opacity:.78;line-height:1.6;">
                  送出後會寫入 Google Sheet 的 orders。
                </div>

                <div id="ckToast" style="margin-top:6px;font-size:.9rem;"></div>

                <button id="ckSubmit" type="submit"
                  style="
                    margin-top:8px;
                    width:100%;
                    border:none;
                    border-radius:18px;
                    padding:16px 14px;
                    font-size:1.05rem;
                    letter-spacing:.12em;
                    font-weight:900;
                    cursor:pointer;
                    background:#5d6b59;
                    color:#fff;
                  ">
                  送出訂單
                </button>

                <button id="ckCancel" type="button"
                  style="
                    width:100%;
                    border:none;
                    border-radius:999px;
                    padding:12px 14px;
                    font-size:.95rem;
                    cursor:pointer;
                    background:rgba(0,0,0,.08);
                    color:rgba(47,58,44,.9);
                  ">
                  返回
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function ckToast(msg, ok = true) {
    const el = $("ckToast");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "rgba(47,58,44,.88)" : "#8a3b3b";
  }

  function bindCheckoutFormEvents() {
    const method = $("ckShipMethod");
    const addrLabel = $("ckAddrLabel");
    const addr = $("ckAddr");
    const cancel = $("ckCancel");
    const form = $("ckForm");

    if (method) {
      method.addEventListener("change", () => {
        const v = String(method.value || "");
        if (addrLabel) addrLabel.textContent = (v === "超商取貨") ? "門市（先手動填）*" : "地址 *";
        if (addr) addr.placeholder = (v === "超商取貨")
          ? "例如：全家 台北中山店（店號12345）"
          : "例如：台北市中山區…";
      });
    }

    if (cancel) cancel.addEventListener("click", () => closeCheckoutModal());

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await submitOrderToGAS();
      });
    }
  }

  function refreshCheckoutSummary() {
    const { cart, subtotal } = getHydratedCartAndSubtotal();

    const discount = Math.min(subtotal, Math.max(0, Number(window.TEN_APPLIED?.discount || 0)));
    const after = Math.max(0, subtotal - discount);
    const shippingFee = calcShipping(after);
    const total = after + shippingFee;

    const a = $("ckSumSubtotal");
    if (a) a.textContent = money(subtotal);
    const b = $("ckSumDiscount");
    if (b) b.textContent = `- ${money(discount)}`;
    const c = $("ckSumShipping");
    if (c) c.textContent = money(shippingFee);
    const d = $("ckSumTotal");
    if (d) d.textContent = money(total);
  }

  async function submitOrderToGAS() {
    const { cart, subtotal } = getHydratedCartAndSubtotal();
    if (subtotal <= 0) return ckToast("購物車是空的", false);

    const memberId = getMemberId();
    const orderId = "O-" + Date.now();

    const name = String($("ckName")?.value || "").trim();
    const phone = String($("ckPhone")?.value || "").trim();
    const email = String($("ckEmail")?.value || "").trim();
    const shippingMethod = String($("ckShipMethod")?.value || "宅配").trim();
    const addressOrStore = String($("ckAddr")?.value || "").trim();
    const note = String($("ckNote")?.value || "").trim();

    if (!name) return ckToast("請填姓名", false);
    if (!phone) return ckToast("請填手機", false);
    if (!addressOrStore) return ckToast(shippingMethod === "超商取貨" ? "請填門市資訊" : "請填地址", false);

    // 折扣：由後端再驗證；這邊只用來算「免運門檻」與預覽
    const discountPreview = Math.min(subtotal, Math.max(0, Number(window.TEN_APPLIED?.discount || 0)));
    const after = Math.max(0, subtotal - discountPreview);
    const shippingFee = calcShipping(after);

    const couponCode = String(window.TEN_APPLIED?.code || "").trim().toUpperCase();

    const btn = $("ckSubmit");
    if (btn) btn.disabled = true;
    ckToast("送出中…");

    try {
      const res = await fetch(`${GAS_URL}?path=order_create&key=${encodeURIComponent(ADMIN_KEY)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          memberId,
          name,
          phone,
          email,
          shippingMethod,
          addressOrStore,
          note,
          items: cart,        // 直接寫入 items（GAS 會轉成 items_json）
          subtotal,
          shippingFee,
          couponCode
        }),
      });

      const out = await res.json().catch(() => ({}));

      if (!res.ok || !out?.ok) {
        ckToast(couponErrorText(out?.error || "SERVER_ERROR"), false);
        if (btn) btn.disabled = false;
        return;
      }

      // ✅ 成功：清空購物車 + 清除優惠碼
      writeCart([]);
      window.TEN_APPLIED = { code: "", discount: 0, note: "" };
      const inp = $("drawerCouponCode");
      if (inp) inp.value = "";

      renderCartBadge();
      renderDrawer();

      ckToast(`✅ 已建立訂單：${out.orderId}`, true);

      // 關閉 modal + drawer
      setTimeout(() => {
        closeCheckoutModal();
        closeDrawer();
        showDrawerToast(`訂單已送出 ✅ ${out.orderId}`, true);
      }, 650);

    } catch (e) {
      console.error(e);
      ckToast("送出失敗，請稍後再試", false);
      if (btn) btn.disabled = false;
      return;
    } finally {
      if (btn) btn.disabled = false;
    }
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

    // ✅ 改成：開啟結帳 modal（不是示意清空）
    const checkoutBtn = $("cartGoCheckout");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        const { subtotal } = getHydratedCartAndSubtotal();
        if (subtotal <= 0) return showDrawerToast("購物車是空的", false);
        openCheckoutModal();
      });
    }

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
      if (dr && dr.classList.contains("open") && dr.hidden === false) renderDrawer();

      // 如果 checkout modal 開著，也刷新摘要
      if (isCheckoutOpen()) refreshCheckoutSummary();

      maybeRevalidateCoupon();
    });

    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY) {
        renderCartBadge();
        const dr = $("cartDrawer");
        if (dr && dr.classList.contains("open") && dr.hidden === false) renderDrawer();
        if (isCheckoutOpen()) refreshCheckoutSummary();
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
