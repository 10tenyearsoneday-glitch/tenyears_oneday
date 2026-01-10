document.addEventListener("DOMContentLoaded", () => {
  const headerContainer = document.getElementById("header");
  if (headerContainer) {
    fetch("header.html")
      .then(res => res.text())
      .then(html => {
        headerContainer.innerHTML = html;
      });
  }
});


// include-shop.js
const API_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

let SETTINGS = {};
let COUPONS = [];
let CART = [];
let appliedCouponCode = null;
let isFirstPurchase = true;       // 你可以依會員狀態設定
let isBirthdayMonth = false;      // 你可以依會員生日設定

// -------------------- 載入共用 header --------------------
function loadHeader() {
  fetch("header.html")
    .then(res => res.text())
    .then(html => {
      const headerEl = document.getElementById("header");
      if (headerEl) headerEl.innerHTML = html;
    })
    .catch(err => console.error("載入 header 失敗", err));
}

// -------------------- API --------------------
async function fetchProducts() {
  const res = await fetch(`${API_URL}?path=products`, { cache: "no-store" });
  return res.json();
}
async function fetchSettings() {
  const res = await fetch(`${API_URL}?path=settings`, { cache: "no-store" });
  return res.json();
}
async function fetchCoupons() {
  const res = await fetch(`${API_URL}?path=coupons`, { cache: "no-store" });
  return res.json();
}
async function createOrder(orderData) {
  const res = await fetch(`${API_URL}?path=order_create`, {
    method: "POST",
    body: JSON.stringify(orderData)
  });
  return res.json();
}

// -------------------- 購物車操作 --------------------
function addToCart(product, qty = 1) {
  const existing = CART.find(item => item.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    CART.push({ ...product, qty });
  }
  renderCart();
}
function updateCart(productId, qty) {
  const item = CART.find(p => p.id === productId);
  if (item) item.qty = qty;
  renderCart();
}
function removeFromCart(productId) {
  CART = CART.filter(p => p.id !== productId);
  renderCart();
}
function clearCart() {
  CART = [];
  renderCart();
}
function getCartSubtotal() {
  return CART.reduce((sum, p) => sum + p.price * p.qty, 0);
}

// -------------------- 折扣與運費計算 --------------------
function calculateTotal() {
  let subtotal = getCartSubtotal();
  let discount = 0;

  // 首購折扣
  if (isFirstPurchase && SETTINGS.first_purchase_discount) {
    discount += subtotal * (1 - Number(SETTINGS.first_purchase_discount));
  }

  // 生日月折扣
  if (isBirthdayMonth && SETTINGS.birthday_discount) {
    discount += subtotal * (1 - Number(SETTINGS.birthday_discount));
  }

  // 優惠碼折扣
  if (appliedCouponCode) {
    const coupon = COUPONS.find(c => String(c.code).toUpperCase() === String(appliedCouponCode).toUpperCase());
    if (coupon && coupon.enabled) {
      if (coupon.type === "rate") {
        discount += subtotal * (1 - Number(coupon.rate));
      } else if (coupon.type === "amount") {
        discount += Number(coupon.amount);
      }
    }
  }

  // 運費
  let shippingFee = 0;
  if (SETTINGS.shipping_enabled) {
    shippingFee = Number(SETTINGS.shipping_fee || 0);
    if (subtotal - discount >= Number(SETTINGS.free_shipping_threshold || 0)) {
      shippingFee = 0; // 達免運門檻
    }
  }

  const total = subtotal - discount + shippingFee;
  return { subtotal, discount, shippingFee, total };
}

// -------------------- 渲染商品與購物車 --------------------
function renderProducts(products) {
  const listEl = document.getElementById("productList");
  if (!listEl) return;
  listEl.innerHTML = products.map(p => `
    <div class="product-card">
      <h4>${p.name}</h4>
      <p>價格：${p.price}</p>
      <button onclick='addToCart(${JSON.stringify(p)})'>加入購物車</button>
    </div>
  `).join("");
}

function renderCart() {
  const cartEl = document.getElementById("cart");
  const totalEl = document.getElementById("cartTotal");
  if (!cartEl || !totalEl) return;

  if (!CART.length) {
    cartEl.innerHTML = "<p>購物車目前是空的</p>";
    totalEl.innerHTML = "";
    return;
  }

  cartEl.innerHTML = CART.map(item => `
    <div class="cart-item">
      <span>${item.name} x ${item.qty}</span>
      <span>小計：${item.price * item.qty}</span>
      <button onclick="removeFromCart('${item.id}')">刪除</button>
    </div>
  `).join("");

  const totals = calculateTotal();
  totalEl.innerHTML = `
    <p>商品小計：${totals.subtotal}</p>
    <p>折扣：-${totals.discount}</p>
    <p>運費：${totals.shippingFee}</p>
    <p><strong>總額：${totals.total}</strong></p>
  `;
}

// -------------------- 套用優惠碼 --------------------
function applyCoupon() {
  const inputEl = document.getElementById("couponInput");
  if (!inputEl) return;
  appliedCouponCode = inputEl.value.trim();
  renderCart();
}

// -------------------- 初始化 --------------------
document.addEventListener("DOMContentLoaded", async () => {
  // 載入 header
  loadHeader();

  // 載入商品、設定、優惠碼
  const products = await fetchProducts();
  SETTINGS = await fetchSettings();
  COUPONS = await fetchCoupons();

  renderProducts(products);
  renderCart();
});
