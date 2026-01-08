// include.js (FINAL A++ Full)
// - header.html 內含：header + nav + cart drawer/backdrop + checkout modal DOM
// - include.js 負責：插入 header、active、badge、抽屜互動、優惠碼、結帳表單、寫入 orders（order_create）

(() => {
  if (window.TEN_INCLUDE_LOADED) return;
  window.TEN_INCLUDE_LOADED = true;

  // ===== 全域設定 =====
  // window.API_BASE 已不再使用（改用 GAS）

  const CART_KEY = "ten_cart";
  const MEMBER_KEY = "ten_member_id";

  window.TEN_CONFIG = window.TEN_CONFIG || {
    products_gas_url: "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec",
    members_gas_url: "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec"
  };

  const GAS_PRODUCTS_URL = window.TEN_CONFIG.products_gas_url;
  const GAS_MEMBERS_URL  = window.TEN_CONFIG.members_gas_url;

  // ⚠️ 注意：放在前端一定會曝光（任何人都能看到）
  // 目前先沿用你現況；正式上線金流建議改由 server 代理
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

  // 讓其他頁可直接用：TEN.addToCart(...)
  window.TEN = window.TEN || {};

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

  // ====== 共用：addToCart（你問的就在這） ======
  // product 最少要有 id；最好有 title/price/image（抽屜會更漂亮）
  function addToCart(product, qty = 1) {
    const pid = String(product?.id || "").trim();
    if (!pid) return { ok: false, error: "NO_ID" };

    const cart = readCart();
    const i = cart.findIndex((x) => String(x.id) === pid);

    const nextQty = normalizeQty(qty);

    if (i === -1) {
      cart.push({
        id: pid,
        qty: nextQty,
        // 下面是可選，讓抽屜不用等 hydrate
        title: product?.title,
        price: product?.price,
        image: product?.image,
      });
    } else {
      cart[i].qty = normalizeQty(Number(cart[i].qty || 1) + nextQty);
      // 如果原本沒有 title/price/image，補上（不覆蓋已有的）
      if (!cart[i].title && product?.title) cart[i].title = product.title;
      if ((cart[i].price == null || cart[i].price === "") && product?.price != null) cart[i].price = product.price;
      if (!cart[i].image && product?.image) cart[i].image = product.image;
    }

    writeCart(cart);
    return { ok: true };
  }

  // 開放給其他頁呼叫
  window.TEN.addToCart = addToCart;
  window.TEN.readCart = readCart;
  window.TEN.writeCart = writeCart;

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
      bindCheckoutModal(); // ✅ 結帳 modal

    } catch (e) {
      console.warn("loadHeader failed:", e);
    }
  }

  function ensureCartBadgeNode() {
    // 你的 header.html 已經有 cartCount（而且有 hidden）
    // 這裡只做「保險」：如果沒節點就補
    if ($("cartCount")) return;
    const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!cartA) return;

    const span = document.createElement("span");
    span.id = "cartCount";
    span.className = "cart-badge";
    span.hidden = true;
    cartA.appendChild(span);
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

    bd.setAttribute("aria-hidden", "false");
    dr.setAttribute("aria-hidden", "false");

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
        closeDrawer();
        closeCheckoutModal();
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
      el.hidden = false;                 // ✅ 修掉你 header.html 的 hidden 造成不顯示
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
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=settings`, { cache: "no-store" });
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

  // ===== products cache for drawer hydration =====
  async function loadProductsCache() {
    const cacheKey = "tyod_products_cache_v1";
    // sessionStorage 優先，避免每頁都抓
    const ss = sessionStorage.getItem(cacheKey);
    if (ss) {
      try {
        const arr = JSON.parse(ss);
        if (Array.isArray(arr)) {
          window.TEN_PRODUCTS_BY_ID = Object.fromEntries(arr.map(p => [String(p.id ?? p._id ?? ""), p]).filter(([k])=>k));
          return;
        }
      } catch {}
    }

    try {
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=products`, { cache: "no-store" });
      if (!res.ok) throw new Error("products error " + res.status);
      const arr = await res.json();
      if (Array.isArray(arr)) {
        sessionStorage.setItem(cacheKey, JSON.stringify(arr));
        window.TEN_PRODUCTS_BY_ID = Object.fromEntries(arr.map(p => [String(p.id ?? p._id ?? ""), p]).filter(([k])=>k));
      }
    } catch (e) {
      console.warn("loadProductsCache failed", e);
    }
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

  function renderDrawer() {
    const cartRaw = readCart();
    const cart = cartRaw.map(hydrateCartItem);

    const itemsEl = $("cartItems");
    if (!itemsEl) return;

    if (!cart.length) itemsEl.innerHTML = `<div class="muted">購物車是空的。</div>`;
    else itemsEl.innerHTML = cartRaw.map(itemRowHtml).join("");

    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);

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
      `${GAS_PRODUCTS_URL}?path=coupon_validate` +
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
    };
    return m[String(err || "")] || `套用失敗（${err || "ERROR"}）`;
  }

  async function applyCouponFromDrawer() {
    const cart = readCart().map(hydrateCartItem);
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);

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
      showCouponToast(`已套用 ${window.TEN_APPLIED.code} ✅ 折抵 ${money(window.TEN_APPLIED.discount)}`);
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

    const cart = readCart().map(hydrateCartItem);
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);

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
  // ✅ Checkout Modal：表單 + 寫入 orders（order_create）
  // ==========================================================
  function openCheckoutModal() {
    const bd = $("ckBackdrop");
    const wrap = $("ckWrap");
    if (!bd || !wrap) {
      showDrawerToast("找不到結帳視窗 DOM（ckBackdrop/ckWrap）", false);
      return;
    }

    const cart = readCart().map(hydrateCartItem);
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);

    if (subtotal <= 0) {
      showDrawerToast("購物車是空的", false);
      return;
    }

    const discount = Math.min(subtotal, Math.max(0, Number(window.TEN_APPLIED?.discount || 0)));
    const after = Math.max(0, subtotal - discount);
    const shippingFee = calcShipping(after);
    const total = after + shippingFee;

    const memberId = getMemberId();

    wrap.innerHTML = `
      <div class="pd-card" style="padding:12px 12px 16px;">
        <div style="text-align:center; padding:10px 6px 6px;">
          <div style="font-weight:900; letter-spacing:.08em;">填寫訂單資料</div>
          <div style="margin-top:6px; font-size:.9rem; opacity:.75;">結帳後會寫入 Google Sheet（orders）</div>
        </div>

        <form id="ckForm" style="padding:10px 6px 0;">
          <div style="display:grid; gap:10px;">
            <input id="ckName" placeholder="姓名 *" autocomplete="name"
              style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.92);outline:none;">
            <input id="ckPhone" placeholder="手機 *" inputmode="tel" autocomplete="tel"
              style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.92);outline:none;">
            <input id="ckEmail" placeholder="Email（選填）" inputmode="email" autocomplete="email"
              style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.92);outline:none;">

            <select id="ckShipMethod"
              style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.92);outline:none;">
              <option value="宅配">宅配</option>
              <option value="超商">超商取貨（先手動填門市）</option>
            </select>

            <input id="ckAddress" placeholder="地址 / 超商門市資訊 *"
              style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.92);outline:none;">

            <textarea id="ckNote" placeholder="備註（選填）" rows="3"
              style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.92);outline:none;resize:vertical;"></textarea>
          </div>

          <div style="height:1px;background:rgba(0,0,0,.06);margin:12px 0;"></div>

          <div style="font-size:.95rem; line-height:1.9; opacity:.9;">
            <div style="display:flex;justify-content:space-between;"><span>小計</span><strong>${money(subtotal)}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span>折扣</span><strong>- ${money(discount)}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span>運費</span><strong>${money(shippingFee)}</strong></div>
            <div style="display:flex;justify-content:space-between;font-size:1.05rem;"><span>合計</span><strong>${money(total)}</strong></div>
            <div style="margin-top:6px; font-size:.85rem; opacity:.7;">memberId：${memberId}</div>
          </div>

          <button id="ckSubmit" type="submit"
            style="margin-top:12px;width:100%;border:none;border-radius:16px;padding:14px 12px;font-size:1rem;font-weight:900;letter-spacing:.12em;cursor:pointer;background:#8ea08e;color:#fff;">
            送出訂單
          </button>

          <div id="ckToast" style="margin-top:10px;font-size:.9rem;opacity:.9;"></div>
        </form>
      </div>
    `;

    // show modal
    bd.hidden = false;
    bd.classList.add("open");
    bd.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // auto change placeholder
    const shipSel = $("ckShipMethod");
    const addr = $("ckAddress");
    if (shipSel && addr) {
      shipSel.addEventListener("change", () => {
        if (shipSel.value === "超商") {
          addr.placeholder = "超商門市資訊 *（例如：7-11 XX門市 / 店號 / 取貨人）";
        } else {
          addr.placeholder = "宅配地址 *（縣市區路段號樓）";
        }
      });
    }

    // bind submit
    const form = $("ckForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await submitOrderFromModal();
      });
    }
  }

  function closeCheckoutModal() {
    const bd = $("ckBackdrop");
    if (!bd) return;

    bd.classList.remove("open");
    bd.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    setTimeout(() => {
      bd.hidden = true;
      const wrap = $("ckWrap");
      if (wrap) wrap.innerHTML = "";
    }, 180);
  }

  function ckToast(msg, ok = true) {
    const el = $("ckToast");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
  }

  async function submitOrderFromModal() {
    const cart = readCart().map(hydrateCartItem);
    const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const discount = Math.min(subtotal, Math.max(0, Number(window.TEN_APPLIED?.discount || 0)));
    const after = Math.max(0, subtotal - discount);
    const shippingFee = calcShipping(after);
    const total = after + shippingFee;

    const memberId = getMemberId();
    const orderId = "O-" + Date.now();

    const name = String($("ckName")?.value || "").trim();
    const phone = String($("ckPhone")?.value || "").trim();
    const email = String($("ckEmail")?.value || "").trim();
    const shippingMethod = String($("ckShipMethod")?.value || "宅配").trim();
    const addressOrStore = String($("ckAddress")?.value || "").trim();
    const note = String($("ckNote")?.value || "").trim();

    if (!name) return ckToast("請輸入姓名", false);
    if (!phone) return ckToast("請輸入手機", false);
    if (!addressOrStore) return ckToast("請輸入地址 / 門市資訊", false);
    if (!(subtotal > 0)) return ckToast("購物車是空的", false);

    const payload = {
      orderId,
      memberId,
      name,
      phone,
      email,
      shippingMethod,
      addressOrStore,
      note,
      items: cart.map((it) => ({
        id: it.id,
        title: it.title,
        qty: it.qty,
        price: it.price,
        image: it.image,
        lineTotal: it.price * it.qty,
      })),
      subtotal,
      shippingFee,
      // coupon：傳 code 即可，折扣由後端重算 + 寫 coupon_uses
      couponCode: String(window.TEN_APPLIED?.code || "").trim().toUpperCase(),
      // 下面兩個前端不需要傳，後端會算，但留著也無妨（你 GAS 目前不用）
      discount,
      total,
    };

    try {
      ckToast("送出中…");

      const btn = $("ckSubmit");
      if (btn) btn.disabled = true;

      const res = await fetch(`${GAS_PRODUCTS_URL}?path=order_create&key=${encodeURIComponent(ADMIN_KEY)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const out = await res.json().catch(() => null);

      if (!res.ok || !out?.ok) {
        const err = out?.error || "SERVER_ERROR";
        ckToast(`送出失敗：${err}`, false);
        const btn = $("ckSubmit");
        if (btn) btn.disabled = false;
        return;
      }

      ckToast(`✅ 訂單建立成功：${out.orderId}`);

      // 清空 cart + coupon
      writeCart([]);
      window.TEN_APPLIED = { code: "", discount: 0, note: "" };
      const inp = $("drawerCouponCode");
      if (inp) inp.value = "";

      renderDrawer();
      renderCartBadge();

      setTimeout(() => {
        closeCheckoutModal();
        closeDrawer();
      }, 650);

    } catch (e) {
      console.error(e);
      ckToast("系統忙碌，請稍後再試", false);
      const btn = $("ckSubmit");
      if (btn) btn.disabled = false;
    }
  }

  function bindCheckoutModal() {
    if (window.TEN_CHECKOUT_BOUND) return;
    window.TEN_CHECKOUT_BOUND = true;

    const closeBtn = $("ckClose");
    if (closeBtn) closeBtn.addEventListener("click", closeCheckoutModal);

    const bd = $("ckBackdrop");
    if (bd) {
      bd.addEventListener("click", (e) => {
        // 點 backdrop 才關閉（避免點到 panel 也關）
        if (e.target === bd) closeCheckoutModal();
      });
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

    const checkoutBtn = $("cartGoCheckout");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        // ✅ 不再「示意清空」：改成打開結帳表單 + 寫入 orders
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
    await loadProductsCache();
    renderCartBadge();
    bindListeners();
  });
})();
