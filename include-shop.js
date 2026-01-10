// include-shop.js
const API_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

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

// -------------------- 購物車 --------------------
let CART = [];

function addToCart(product, qty = 1) {
  const existing = CART.find(item => item.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    CART.push({ ...product, qty });
  }
}

function updateCart(productId, qty) {
  const item = CART.find(p => p.id === productId);
  if (item) item.qty = qty;
}

function removeFromCart(productId) {
  CART = CART.filter(p => p.id !== productId);
}

function clearCart() {
  CART = [];
}

function getCartSubtotal() {
  return CART.reduce((sum, p) => sum + p.price * p.qty, 0);
}

// -------------------- 折扣與運費計算 --------------------
function calculateTotal(settings, coupons, appliedCouponCode, isFirstPurchase, isBirthdayMonth) {
  let subtotal = getCartSubtotal();
  let discount = 0;

  // 首購折扣
  if (isFirstPurchase && settings.first_purchase_discount) {
    discount += subtotal * (1 - Number(settings.first_purchase_discount));
  }

  // 生日月折扣
  if (isBirthdayMonth && settings.birthday_discount) {
    discount += subtotal * (1 - Number(settings.birthday_discount));
  }

  // 優惠碼折扣
  if (appliedCouponCode) {
    const coupon = coupons.find(c => String(c.code).toUpperCase() === String(appliedCouponCode).toUpperCase());
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
  if (settings.shipping_enabled) {
    shippingFee = Number(settings.shipping_fee || 0);
    if (subtotal - discount >= Number(settings.free_shipping_threshold || 0)) {
      shippingFee = 0; // 達免運門檻
    }
  }

  const total = subtotal - discount + shippingFee;
  return { subtotal, discount, shippingFee, total };
}

// -------------------- Toast --------------------
function toast(el, msg, ok = true) {
  el.textContent = msg || "";
  el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
}
