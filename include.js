// include.js (完整取代版)
// - 插入 header.html
// - nav/icon active
// - 右上角購物車 badge (#cartCount) with ten_cart
// - 點購物車 icon → 開 drawer
// - drawer 內可加減/刪除/清空
// - 點結帳 → 開 checkout modal（跳出視窗）
// - 監聽 cart:changed / storage 同步更新
window.API_BASE = "https://tenyears-oneday-api.onrender.com";
const CART_KEY = "ten_cart";

// ===== header load =====
async function loadHeader() {
  if (document.documentElement.dataset.headerLoaded === "1") return;
  document.documentElement.dataset.headerLoaded = "1";

  try {
    const res = await fetch("header.html", { cache: "no-store" });
    const html = await res.text();
    document.body.insertAdjacentHTML("afterbegin", html);

    const page = location.pathname.split("/").pop() || "index.html";
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
    bindCartIconOpenDrawer();   // ✅ 新增：點 icon 開抽屜
    bindDrawerUi();             // ✅ 新增：抽屜 UI 行為
  } catch (e) {
    console.warn("loadHeader failed:", e);
  }
}

// ===== badge =====
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

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeCart(arr) {
  localStorage.setItem(CART_KEY, JSON.stringify(arr));
  window.dispatchEvent(new Event("cart:changed"));
}

function readCartCount() {
  return readCart().reduce((sum, x) => sum + Math.max(0, Number(x.qty || 0)), 0);
}

function renderCartBadge() {
  const el = document.getElementById("cartCount");
  if (!el) return;

  const n = readCartCount();
  if (n > 0) {
    el.textContent = String(n);
    el.style.display = "inline-flex";
  } else {
    el.textContent = "";
    el.style.display = "none";
  }
}

// ===== drawer open by icon =====
function bindCartIconOpenDrawer() {
  const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
  if (!cartA) return;

  cartA.addEventListener("click", (e) => {
    // cart.html 就不要擋：讓它去 cart.html
    const page = location.pathname.split("/").pop() || "index.html";
    if (page === "cart.html") return;

    e.preventDefault();
    openCartDrawer();
  });
}

// ===== drawer UI =====
function qs(id){ return document.getElementById(id); }

function money(n){
  n = Math.round(Number(n||0));
  return `NT$ ${n}`;
}
function clampQty(v){
  v = Number(v);
  if(!Number.isFinite(v) || v < 1) v = 1;
  return Math.floor(v);
}

let SETTINGS = {
  shipping_enabled: true,
  shipping_fee: 60,
  free_shipping_threshold: 1000,
};

async function loadSettingsForDrawer(){
  try{
    const res = await fetch(`${API_BASE}/settings`, { cache:"no-store" });
    if(!res.ok) throw new Error(res.status);
    const s = await res.json();
    if(s && typeof s === "object"){
      SETTINGS = {
        ...SETTINGS,
        ...s,
        shipping_fee: Number(s.shipping_fee ?? SETTINGS.shipping_fee),
        free_shipping_threshold: Number(s.free_shipping_threshold ?? SETTINGS.free_shipping_threshold),
        shipping_enabled: !!s.shipping_enabled
      };
    }
  }catch(e){
    // 沒關係，drawer 仍可用預設值
  }
}

function calcSubtotal(cart){
  return cart.reduce((sum,it)=> sum + Number(it.price||0)*clampQty(it.qty), 0);
}
function calcShipping(subtotalAfterDiscount){
  if(!SETTINGS.shipping_enabled) return 0;
  const fee = Number(SETTINGS.shipping_fee||0);
  const freeOver = Number(SETTINGS.free_shipping_threshold||0);
  if(freeOver > 0 && subtotalAfterDiscount >= freeOver) return 0;
  return fee;
}

function renderDrawer(){
  const itemsEl = qs("cartItems");
  const subtotalEl = qs("cartSubtotal");
  const discountEl = qs("cartDiscount");
  const shipEl = qs("cartShipping");
  const totalEl = qs("cartTotal");
  const toastEl = qs("cartToast");

  if(!itemsEl) return;

  const cart = readCart();

  if(cart.length === 0){
    itemsEl.innerHTML = `<div style="opacity:.75; padding:6px 2px;">購物車目前是空的。</div>`;
    subtotalEl && (subtotalEl.textContent = money(0));
    discountEl && (discountEl.textContent = `- ${money(0)}`);
    shipEl && (shipEl.textContent = money(0));
    totalEl && (totalEl.textContent = money(0));
    toastEl && (toastEl.textContent = "");
    return;
  }

  itemsEl.innerHTML = cart.map(it => `
    <div class="d-item">
      <div class="d-thumb"><img src="${it.image||'assets/placeholder.png'}" alt=""></div>
      <div class="d-info">
        <div class="d-name">${it.title||'（未命名）'}</div>
        <div class="d-meta">${money(it.price||0)}</div>
      </div>
      <div class="d-right">
        <div class="d-price">${money((it.price||0)*clampQty(it.qty))}</div>
        <div class="d-qty">
          <button type="button" data-dec="${it.id}">-</button>
          <input type="number" min="1" value="${clampQty(it.qty)}" data-qty="${it.id}">
          <button type="button" data-inc="${it.id}">+</button>
        </div>
        <button class="d-del" type="button" data-del="${it.id}">刪除</button>
      </div>
    </div>
  `).join("");

  // events
  itemsEl.querySelectorAll("[data-inc]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = String(btn.getAttribute("data-inc"));
      const arr = readCart();
      const hit = arr.find(x=>String(x.id)===id);
      if(hit){ hit.qty = clampQty(Number(hit.qty||1)+1); writeCart(arr); }
    });
  });
  itemsEl.querySelectorAll("[data-dec]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = String(btn.getAttribute("data-dec"));
      const arr = readCart();
      const hit = arr.find(x=>String(x.id)===id);
      if(hit){ hit.qty = clampQty(Math.max(1, Number(hit.qty||1)-1)); writeCart(arr); }
    });
  });
  itemsEl.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = String(btn.getAttribute("data-del"));
      const arr = readCart().filter(x=>String(x.id)!==id);
      writeCart(arr);
    });
  });
  itemsEl.querySelectorAll("[data-qty]").forEach(inp=>{
    inp.addEventListener("change", ()=>{
      const id = String(inp.getAttribute("data-qty"));
      const v = clampQty(inp.value);
      const arr = readCart();
      const hit = arr.find(x=>String(x.id)===id);
      if(hit){ hit.qty = v; writeCart(arr); }
    });
  });

  const subtotal = calcSubtotal(cart);
  const discount = 0; // drawer 先不做 coupon（要做也可以）
  const after = Math.max(0, subtotal - discount);
  const shipping = calcShipping(after);
  const total = after + shipping;

  subtotalEl && (subtotalEl.textContent = money(subtotal));
  discountEl && (discountEl.textContent = `- ${money(discount)}`);
  shipEl && (shipEl.textContent = money(shipping));
  totalEl && (totalEl.textContent = money(total));
}

function openCartDrawer(){
  const drawer = qs("cartDrawer");
  const back = qs("cartBackdrop");
  if(!drawer || !back) return;

  drawer.classList.add("open");
  back.classList.add("open");
  document.body.style.overflow = "hidden";

  // 進 drawer 才背景抓一次 settings（不阻塞）
  loadSettingsForDrawer().finally(renderDrawer);
}

function closeCartDrawer(){
  const drawer = qs("cartDrawer");
  const back = qs("cartBackdrop");
  if(!drawer || !back) return;

  drawer.classList.remove("open");
  back.classList.remove("open");
  document.body.style.overflow = "";
}

function bindDrawerUi(){
  const back = qs("cartBackdrop");
  const closeBtn = qs("cartClose");
  const clearBtn = qs("cartClear");
  const checkoutBtn = qs("cartGoCheckout");

  back && back.addEventListener("click", closeCartDrawer);
  closeBtn && closeBtn.addEventListener("click", closeCartDrawer);

  clearBtn && clearBtn.addEventListener("click", ()=>{
    if(confirm("確定要清空購物車嗎？")){
      writeCart([]);
    }
  });

  checkoutBtn && checkoutBtn.addEventListener("click", ()=>{
    closeCartDrawer();
    openCheckoutModal();
  });
}

// ===== checkout modal =====
function openCheckoutModal(){
  const bd = qs("ckBackdrop");
  const close = qs("ckClose");
  const wrap = qs("ckWrap");
  if(!bd || !wrap) return;

  const cart = readCart();
  const subtotal = calcSubtotal(cart);
  const shipping = calcShipping(subtotal);
  const total = subtotal + shipping;

  wrap.innerHTML = `
    <div style="padding:4px 2px;">
      <div style="font-weight:800; margin-bottom:8px;">訂單確認</div>

      <div class="box" style="max-width:none; margin:0 0 12px;">
        <div style="display:flex;justify-content:space-between;margin:6px 0;">
          <span>小計</span><strong>${money(subtotal)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin:6px 0;">
          <span>運費</span><strong>${money(shipping)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin:6px 0;font-size:1.05rem;">
          <span>合計</span><strong>${money(total)}</strong>
        </div>
      </div>

      <div style="font-weight:800; margin:10px 0 8px;">配送方式</div>
      <div class="subcats" style="margin:0 0 12px;">
        <button class="chip active" type="button" data-ship="711">7-11 店取</button>
        <button class="chip" type="button" data-ship="fam">全家 店取</button>
        <button class="chip" type="button" data-ship="home">宅配</button>
      </div>

      <div class="box" style="max-width:none; margin:0 0 12px;">
        <div style="font-size:.9rem; opacity:.8; margin-bottom:8px;">收件人資料（示意，可接會員資料自動帶入）</div>
        <div class="field" style="margin-bottom:10px;">
          <div class="label">姓名</div>
          <input id="ckName" style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);" placeholder="請輸入姓名">
        </div>
        <div class="field" style="margin-bottom:10px;">
          <div class="label">手機</div>
          <input id="ckPhone" inputmode="numeric" style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);" placeholder="請輸入手機">
        </div>
        <div class="field" id="ckAddrField">
          <div class="label">地址 / 門市</div>
          <input id="ckAddr" style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.12);" placeholder="可貼上門市名稱/地址">
        </div>
        <div style="margin-top:8px; font-size:.85rem; opacity:.8;">
          門市查詢：<a href="https://emap.pcsc.com.tw/emap.aspx" target="_blank" rel="noopener">7-11</a> /
          <a href="https://www.family.com.tw/Marketing/zh/Map" target="_blank" rel="noopener">全家</a>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="pd-btn secondary" type="button" id="ckCancel">取消</button>
        <button class="pd-btn primary" type="button" id="ckSubmit">送出訂單（示意）</button>
      </div>

      <div id="ckToast" style="margin-top:10px; font-size:.9rem; opacity:.85;"></div>
    </div>
  `;

  // ship selector
  let shipType = "711";
  wrap.querySelectorAll('[data-ship]').forEach(btn=>{
    btn.addEventListener("click", ()=>{
      wrap.querySelectorAll('[data-ship]').forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      shipType = btn.getAttribute("data-ship");
    });
  });

  const closeModal = ()=>{
    bd.classList.remove("open");
    bd.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
  };

  qs("ckClose")?.addEventListener("click", closeModal);
  qs("ckCancel")?.addEventListener("click", closeModal);
  bd.addEventListener("click", (e)=>{ if(e.target===bd) closeModal(); });
  window.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && bd.classList.contains("open")) closeModal(); });

  wrap.querySelector("#ckSubmit").addEventListener("click", ()=>{
    const name = wrap.querySelector("#ckName").value.trim();
    const phone = wrap.querySelector("#ckPhone").value.trim();
    const addr = wrap.querySelector("#ckAddr").value.trim();
    const t = wrap.querySelector("#ckToast");

    if(!name || !phone || !addr){
      t.textContent = "請把姓名/手機/地址(門市)填完整";
      t.style.color = "#8a3b3b";
      return;
    }

    t.textContent = `✅ 已送出（示意）｜配送：${shipType}｜合計：${money(total)}`;
    t.style.color = "rgba(47,58,44,.9)";

    // ✅ 示意：送出後清空購物車
    writeCart([]);
    setTimeout(closeModal, 900);
  });

  bd.classList.add("open");
  bd.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}

function bindCartBadgeListeners() {
  window.addEventListener("cart:changed", () => {
    renderCartBadge();
    renderDrawer(); // 如果抽屜開著，會即時更新
  });

  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) {
      renderCartBadge();
      renderDrawer();
    }
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadHeader();
  renderCartBadge();
  bindCartBadgeListeners();
});
