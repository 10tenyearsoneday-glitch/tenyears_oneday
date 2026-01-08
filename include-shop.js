// include-shop.js
// TEN YEARS ONE DAY – SHOP ONLY (FINAL)
// 負責：header、商品、購物車、優惠碼、結帳
// 不包含會員註冊 / 登入 / profile

(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;

  /* ========= 基本設定 ========= */
  const CART_KEY = "ten_cart";
  const MEMBER_KEY = "ten_member_id";

  const GAS_PRODUCTS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const ADMIN_KEY = "10years1day911321"; // 先沿用你目前的

  const SETTINGS_DEFAULT = {
    shipping_enabled: true,
    shipping_fee: 60,
    free_shipping_threshold: 1000,
    first_purchase_discount: 0.9,
    birthday_discount: 0.85
  };

  window.TEN_SETTINGS = { ...SETTINGS_DEFAULT };
  window.TEN_APPLIED = { code: "", discount: 0 };
  window.TEN = window.TEN || {};

  /* ========= 小工具 ========= */
  const $ = (id) => document.getElementById(id);
  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;
  const normalizeQty = (n) => Math.max(1, Math.floor(Number(n || 1)));

  function getMemberId() {
    let id = localStorage.getItem(MEMBER_KEY);
    if (!id) {
      id = "M-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      localStorage.setItem(MEMBER_KEY, id);
    }
    return id;
  }

  /* ========= 購物車 ========= */
  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart:changed"));
  }

  function cartCount() {
    return readCart().reduce((s, i) => s + normalizeQty(i.qty), 0);
  }

  function addToCart(product, qty = 1) {
    const cart = readCart();
    const pid = String(product.id);
    const i = cart.findIndex((x) => x.id === pid);

    if (i === -1) {
      cart.push({
        id: pid,
        title: product.title,
        price: product.price,
        image: product.image,
        qty: normalizeQty(qty)
      });
    } else {
      cart[i].qty += normalizeQty(qty);
    }

    writeCart(cart);
  }

  window.TEN.addToCart = addToCart;

  /* ========= Header ========= */
  async function loadHeader() {
    if (document.body.dataset.headerLoaded) return;
    document.body.dataset.headerLoaded = "1";

    const res = await fetch("./header.html", { cache: "no-store" });
    const html = await res.text();
    document.body.insertAdjacentHTML("afterbegin", html);

    const badge = $("cartCount");
    if (badge) {
      const n = cartCount();
      badge.textContent = n;
      badge.style.display = n ? "inline-flex" : "none";
    }

    const cartBtn = document.querySelector('[data-icon="cart"]');
    if (cartBtn) {
      cartBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openDrawer();
      });
    }
  }

  /* ========= Drawer ========= */
  function openDrawer() {
    const bd = $("cartBackdrop");
    const dr = $("cartDrawer");
    if (!bd || !dr) {
      console.warn("cart drawer DOM missing: cartBackdrop/cartDrawer");
      return;
    }

    // ⚠️ 你的 header.css / drawer css 是靠 `.open` 觸發右側滑入
    bd.hidden = false;
    dr.hidden = false;
    bd.classList.add("open");
    dr.classList.add("open");
    bd.setAttribute("aria-hidden", "false");
    dr.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

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

    // 讓 transition 走完再 hidden
    setTimeout(() => {
      bd.hidden = true;
      dr.hidden = true;
    }, 220);
  }

  function renderDrawer() {
    const cart = readCart();
    const itemsEl = $("cartItems");

    if (!cart.length) {
      itemsEl.innerHTML = `<div class="muted">購物車是空的</div>`;
      return;
    }

    itemsEl.innerHTML = cart
      .map(
        (it) => `
      <div class="d-item">
        <img src="${it.image}">
        <div>
          <div>${it.title}</div>
          <div>${money(it.price)}</div>
        </div>
        <div>x ${it.qty}</div>
      </div>
    `
      )
      .join("");

    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    $("cartSubtotal").textContent = money(subtotal);
    $("cartTotal").textContent = money(subtotal);
  }

  /* ========= 結帳（先不接金流） ========= */
  function goCheckoutPage() {
    const cart = readCart();
    if (!cart.length) return alert("購物車是空的");
    // 先用轉跳頁面（checkout.html 讀 localStorage 的 ten_cart）
    location.href = "checkout.html";
  }

  /* ========= 監聽 ========= */
  function bindEvents() {
    $("cartClose")?.addEventListener("click", closeDrawer);
    $("cartBackdrop")?.addEventListener("click", closeDrawer);
    $("cartGoCheckout")?.addEventListener("click", goCheckoutPage);

    window.addEventListener("cart:changed", () => {
      const badge = $("cartCount");
      if (badge) {
        const n = cartCount();
        badge.textContent = n;
        badge.style.display = n ? "inline-flex" : "none";
      }
      renderDrawer();
    });
  }

  /* ========= Init ========= */
  window.addEventListener("DOMContentLoaded", async () => {
    await loadHeader();
    bindEvents();
  });
})();
