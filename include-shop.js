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
    function (items) {
      const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
      return { subtotal, discount: 0, shipping: 0, total: subtotal };
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
