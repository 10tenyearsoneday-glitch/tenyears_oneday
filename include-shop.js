window.GAS_PRODUCTS_URL =
  window.GAS_PRODUCTS_URL ||
  "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
// include-shop.js — TEN YEARS ONE DAY (FINAL, STABLE, NO MODULE)

(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;

  const CART_KEY = "ten_cart";
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const $ = (id) => document.getElementById(id);
  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;

  /* ===== settings ===== */
  let SETTINGS = null;
  async function getSettings() {
    if (SETTINGS) return SETTINGS;
    const res = await fetch(`${GAS_URL}?path=settings`, { cache: "no-store" });
    const out = await res.json();
    SETTINGS = out.ok && out.data ? out.data : out;
    return SETTINGS;
  }

  /* ===== pricing bridge ===== */
 const PRICING = window.TEN_PRICING || {};

const calcTotal =
  PRICING.calcTotal ||
  function (items, settings = {}, ctx = {}) {

    const num = v => Number(v || 0);

    const subtotal = items.reduce(
      (s, it) => s + num(it.price) * num(it.qty || 1),
      0
    );
window.TEN_PRICING = { calcTotal };

    let discount = 0;

   // ===== 首購 =====
if (ctx.firstPurchase && settings.first_purchase_discount) {
  discount += Math.round(
    subtotal * (1 - num(settings.first_purchase_discount))
  );
}

// ===== 生日 =====
if (ctx.birthday && settings.birthday_discount) {
  discount += Math.round(
    subtotal * (1 - num(settings.birthday_discount))
  );
}


    // ===== 運費 =====
    const fee  = num(settings.shipping_fee);
    const free = num(settings.free_shipping_threshold);

    let shipping = 0;

    if (fee) {
      if (free && subtotal >= free) {
        shipping = 0;
      } else {
        shipping = fee;
      }
    }

    const total = subtotal - discount + shipping;

    return {
      subtotal,
      discount,
      shipping,
      total
    };
  };


  /* ===== cart storage ===== */
  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart:changed"));
  }

  function cartCount() {
    return readCart().reduce((s, it) => s + Number(it.qty || 1), 0);
  }

  /* ===== PUBLIC API ===== */
  window.TEN = window.TEN || {};

  window.TEN.addToCart = function (product, qty = 1) {
    if (!product || !product.id) return;

    const cart = readCart();
    const id = String(product.id);
    const i = cart.findIndex((x) => x.id === id);

    if (i === -1) {
      cart.push({
        id,
        title: product.title || "",
        price: Number(product.price || 0),
        image: product.image || "",
        qty: Math.max(1, Number(qty || 1)),
      });
    } else {
      cart[i].qty += Math.max(1, Number(qty || 1));
    }

    writeCart(cart);
    openDrawer();
  };

  /* ===== header ===== */
  function loadHeader() {
    if (document.body.dataset.headerLoaded) return;
    document.body.dataset.headerLoaded = "1";

    fetch("./header.html", { cache: "no-store" })
      .then((r) => r.text())
      .then((html) => {
        document.body.insertAdjacentHTML("afterbegin", html);
        bindCartIcon();
        bindDrawerClose();
        bindDrawerActions();
        renderCartBadge();
        renderDrawer();
      });
  }

  function renderCartBadge() {
    const el = $("cartCount");
    if (!el) return;
    const n = cartCount();
    el.textContent = n > 0 ? String(n) : "";
    el.style.display = n > 0 ? "inline-flex" : "none";
  }

  /* ===== drawer open / close ===== */
  function openDrawer() {
    const bd = $("cartBackdrop");
    const dr = $("cartDrawer");

    if (bd) {
      bd.hidden = false;
      bd.classList.add("open");
      bd.setAttribute("aria-hidden", "false");
    }
    if (dr) {
      dr.hidden = false;
      dr.classList.add("open");
      dr.setAttribute("aria-hidden", "false");
    }

    document.body.style.overflow = "hidden";
    renderDrawer();
  }

  function closeDrawer() {
    const bd = $("cartBackdrop");
    const dr = $("cartDrawer");

    if (bd) bd.classList.remove("open");
    if (dr) dr.classList.remove("open");

    document.body.style.overflow = "";

    setTimeout(() => {
      if (bd) {
        bd.hidden = true;
        bd.setAttribute("aria-hidden", "true");
      }
      if (dr) {
        dr.hidden = true;
        dr.setAttribute("aria-hidden", "true");
      }
    }, 180);
  }

  function bindCartIcon() {
    const a = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!a) return;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openDrawer();
    });
  }

  function bindDrawerClose() {
    $("cartClose")?.addEventListener("click", closeDrawer);
    $("cartBackdrop")?.addEventListener("click", closeDrawer);
  }

  /* ===== drawer actions ===== */
  function bindDrawerActions() {
    $("cartClear")?.addEventListener("click", () => {
      if (!confirm("確定要清空購物車？")) return;
      writeCart([]);
      renderDrawer();
    });

    $("cartGoCheckout")?.addEventListener("click", () => {
      window.location.href = "checkout.html";
    });
  }

  /* ===== render drawer ===== */
  async function renderDrawer() {
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

    list.innerHTML = cart
      .map(
        (it) => `
      <div class="d-item">
        <div class="d-thumb"><img src="${it.image || ""}"></div>
        <div class="d-info">
          <div class="d-name">${it.title}</div>
          <div class="d-meta">${money(it.price)}</div>
        </div>
        <div class="d-qty">
          <button data-dec="${it.id}">-</button>
          <input type="number" min="1" value="${it.qty}" data-qty="${it.id}">
          <button data-inc="${it.id}">+</button>
        </div>
        <button class="d-del" data-del="${it.id}">移除</button>
      </div>`
      )
      .join("");

    const settings = await getSettings();
    const pricing = calcTotal(cart, settings, {});

    $("cartSubtotal").textContent = money(pricing.subtotal);
    $("cartShipping").textContent =
      pricing.shipping === 0 ? "免運" : money(pricing.shipping);
    $("cartTotal").textContent = money(pricing.total);
  }

  /* ===== qty / remove ===== */
  document.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const del = e.target.closest("[data-del]");
    let cart = readCart();

    if (inc) cart.find((x) => x.id === inc.dataset.inc).qty++;
    if (dec) {
      const i = cart.find((x) => x.id === dec.dataset.dec);
      i.qty = Math.max(1, i.qty - 1);
    }
    if (del) cart = cart.filter((x) => x.id !== del.dataset.del);

    if (inc || dec || del) {
      writeCart(cart);
      renderDrawer();
    }
  });

  document.addEventListener("change", (e) => {
    const inp = e.target.closest("[data-qty]");
    if (!inp) return;
    const cart = readCart();
    const i = cart.find((x) => x.id === inp.dataset.qty);
    i.qty = Math.max(1, Number(inp.value));
    writeCart(cart);
    renderDrawer();
  });

  window.addEventListener("cart:changed", () => {
    renderCartBadge();
    renderDrawer();
  });

  window.addEventListener("DOMContentLoaded", loadHeader);
})();
/* =========================
   GLOBAL MEMBER BOOTSTRAP (FIX)
========================= */

(async function(){

  const token = localStorage.getItem("ten_token");
  if(!token) return;

  const MEMBER_API =
    "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec";

  try{

    let t = await fetch(
      `${MEMBER_API}?action=me&token=${encodeURIComponent(token)}`
    ).then(r => r.text());

    // JSONP → 剝 callback(...)
    if(t.startsWith("callback")){
      t = t.replace(/^callback\(|\);$/g,"");
    }

    const o = JSON.parse(t);

    if(!o.ok) return;

    window.TEN_MEMBER = o.profile || {};

    // 存生日
    if(TEN_MEMBER.birth){
      const [y,m,d] = TEN_MEMBER.birth.split("-");
      localStorage.setItem("ten_birth_m", m);
      localStorage.setItem("ten_birth_d", d);
    }

    // header
    const mBtn = document.querySelector('[data-icon="member"]');
    if(mBtn){
      mBtn.href = "member-profile.html";
      mBtn.title = "會員中心";
    }

  }catch(e){
    console.warn("member bootstrap fail", e);
  }

})();
