// include.js (Clean A)
// - header.html 內含：header + nav + cart drawer/backdrop + checkout modal DOM
// - include.js 只負責：插入 header、active 狀態、badge、抽屜互動、優惠碼/結帳（示意）

(() => {
  if (window.TEN_INCLUDE_LOADED) return;
  window.TEN_INCLUDE_LOADED = true;

  // ===== 設定 / 常數 =====
  window.API_BASE = window.API_BASE || "https://tenyears-oneday-api.onrender.com";

  const CART_KEY = "ten_cart";
  const MEMBER_KEY = "ten_member_id";

  const GAS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
  const ADMIN_KEY = "10years1day911321"; // ⚠️ 前端會曝光；先照你現況沿用

  window.TEN_SETTINGS = window.TEN_SETTINGS || {
    shipping_enabled: true,
    shipping_fee: 60,
    free_shipping_threshold: 1000,
    first_purchase_discount: 0.9,
    birthday_discount: 0.85,
  };

  window.TEN_APPLIED = window.TEN_APPLIED || { code: "", discount: 0, note: "" };

  // ===== 工具 =====
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

      // icon active（常駐功能頁）
      const iconMap = { "search.html": "search", "cart.html": "cart", "member.html": "member" };
      const iconKey = iconMap[page];
      if (iconKey) {
        const icon = document.querySelector(`.icon-row a[data-icon="${iconKey}"]`);
        if (icon) icon.classList.add("active");
      }

      ensureCartBadgeNode();     // 若 header.html 沒放 badge，補上
      ensureDrawerEnhancements(); // 若 header.html 沒放 promo/coupon 區，補上
      bindDrawerClose();         // 綁 close/backdrop/ESC
      bindCartIconOpen();        // 綁 icon 開抽屜
      bindDrawerActions();       // 綁抽屜內操作（委派）

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

  // ===== Drawer：以 header.html 的 DOM 為主（A 架構）=====
  function openDrawer() {
    const bd = document.getElementById("cartBackdrop");
    const dr = document.getElementById("cartDrawer");
    if (!bd || !dr) return;

    bd.classList.add("open");
    dr.classList.add("open");
    document.body.style.overflow = "hidden";

    // 同步輸入框（若存在）
    const inp = document.getElementById("drawerCouponCode");
    if (inp && window.TEN_APPLIED?.code) inp.value = window.TEN_APPLIED.code;

    renderDrawer();
  }

  function closeDrawer() {
    const bd = document.getElementById("cartBackdrop");
    const dr = document.getElementById("cartDrawer");
    if (!bd || !dr) return;

    bd.classList.remove("open");
    dr.classList.remove("open");
    document.body.style.overflow = "";
  }

  function bindDrawerClose() {
    // 防止重複綁定
    if (window.TEN_DRAWER_CLOSE_BOUND) return;
    window.TEN_DRAWER_CLOSE_BOUND = true;

    document.getElementById("cartClose")?.addEventListener("click", closeDrawer);
    document.getElementById("cartBackdrop")?.addEventListener("click", closeDrawer);
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

  // 若 header.html 沒有 promo tips / coupon 區塊，這裡補上（不影響原本抽屜）
  function ensureDrawerEnhancements() {
    const drawer = document.getElementById("cartDrawer");
    if (!drawer) return;

    // promo tips 放在抽屜 body 最上方
    const bd = drawer.querySelector(".d-bd");
    if (bd && !document.getElementById("cartPromoTips")) {
      const tips = document.createElement("div");
      tips.id = "cartPromoTips";
      tips.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;";
      bd.insertAdjacentElement("afterbegin", tips);
    }

    // coupon 區塊放在 footer（.d-ft）底部
    const ft = drawer.querySelector(".d-ft");
    if (ft && !document.getElementById("drawerCouponCode")) {
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <div style="height:1px;background:rgba(0,0,0,.06);margin:10px 0;"></div>

        <div class="coupon" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input id="drawerCouponCode" placeholder="輸入優惠碼（例如 HELLO）" autocomplete="off"
            style="flex:1;min-width:180px;padding:10px 10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.85);outline:none;text-transform:uppercase">
          <button id="drawerApplyCoupon" type="button"
            style="flex:0 0 auto;padding:10px 12px;border-radius:999px;border:none;background:rgba(0,0,0,.08);cursor:pointer">
            套用
          </button>
        </div>
        <div id="drawerCouponToast" class="toast" style="margin-top:8px;font-size:.9rem;"></div>
      `;
      ft.appendChild(wrap);
    }
  }

  // ===== badge =====
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

  // ===== settings（免運/折扣等）=====
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
    const bdayZhe = rateToZhe(S.birthday_discount);
    if (firstZhe) chips.push(`首購 ${firstZhe} 折`);
    if (bdayZhe) chips.push(`生日月 ${bdayZhe} 折`);

    el.innerHTML = chips.map((t) => `<span class="pill">${t}</span>`).join("");
  }

  // ===== Drawer 渲染 =====
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

    // ✅ 對上 header.html 的 id
    document.getElementById("cartSubtotal")?.textContent = money(subtotal);
    document.getElementById("cartDiscount")?.textContent = `- ${money(discount)}`;
    document.getElementById("cartShipping")?.textContent = money(shipping);
    document.getElementById("cartTotal")?.textContent = money(total);

    renderPromoTips(after);

    const checkoutBtn = document.getElementById("cartGoCheckout");
    if (checkoutBtn) checkoutBtn.disabled = subtotal <= 0;
  }

  function showDrawerToast(msg, ok = true) {
    const el = document.getElementById("cartToast");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
    setTimeout(() => {
      el.style.display = "none";
    }, 1200);
  }

  function showCouponToast(msg, ok = true) {
    const el = document.getElementById("drawerCouponToast");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
    if (msg) setTimeout(() => (el.textContent = ""), 2200);
  }

  // ===== Cart 操作 =====
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
    return { res, out };
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
        note: String(out.note || ""),
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
      if (window.TEN_APPLIED?.code) {
        showCouponToast("結帳中：寫入優惠碼使用紀錄…");
        const res = await fetch(`${GAS_URL}?path=coupon_use&key=${encodeURIComponent(ADMIN_KEY)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: window.TEN_APPLIED.code,
            memberId,
            subtotal,
            orderId,
          }),
        });
        const out = await res.json();
        if (!res.ok || !out?.ok) {
          return showCouponToast(couponErrorText(out?.error), false);
        }
        showCouponToast(`✅ 優惠碼已使用：${out.code}（折抵 ${money(out.discount)}）`);
      }

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

  // ===== Drawer 事件綁定（對 header.html 的 id）=====
  function bindDrawerActions() {
    if (window.TEN_DRAWER_ACTIONS_BOUND) return;
    window.TEN_DRAWER_ACTIONS_BOUND = true;

    // 清空
    document.getElementById("cartClear")?.addEventListener("click", () => {
      if (!confirm("確定要清空購物車嗎？")) return;
      writeCart([]);
      window.TEN_APPLIED = { code: "", discount: 0, note: "" };
      const inp = document.getElementById("drawerCouponCode");
      if (inp) inp.value = "";
      renderDrawer();
      renderCartBadge();
    });

    // 套用優惠碼（如果 UI 被補上或你 header.html 本來就有）
    document.getElementById("drawerApplyCoupon")?.addEventListener("click", applyCouponFromDrawer);
    document.getElementById("drawerCouponCode")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyCouponFromDrawer();
    });

    // 結帳（用你 header.html 的 cartGoCheckout）
    document.getElementById("cartGoCheckout")?.addEventListener("click", checkoutFromDrawer);

    // 抽屜內操作：委派（+/-/刪除）
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

  // ===== 同步監聽 =====
  function bindListeners() {
    if (window.TEN_LISTENERS_BOUND) return;
    window.TEN_LISTENERS_BOUND = true;

    window.addEventListener("cart:changed", () => {
      renderCartBadge();
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
