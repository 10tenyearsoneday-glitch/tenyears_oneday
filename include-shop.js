// include-shop.js
const API_URL = "https://script.google.com/macros/s/你的部署ID/exec";

// -------------------- 商品 --------------------
async function fetchProducts() {
  const res = await fetch(`${API_URL}?path=products`, { cache: "no-store" });
  return res.json();
}

// -------------------- 設定（運費 / 折扣） --------------------
async function fetchSettings() {
  const res = await fetch(`${API_URL}?path=settings`, { cache: "no-store" });
  return res.json();
}

// -------------------- 優惠碼 --------------------
async function fetchCoupons() {
  const res = await fetch(`${API_URL}?path=coupons`, { cache: "no-store" });
  return res.json();
}

// -------------------- 建立訂單 --------------------
async function createOrder(orderData) {
  const res = await fetch(`${API_URL}?path=order_create`, {
    method: "POST",
    body: JSON.stringify(orderData)
  });
  return res.json();
}

// -------------------- 購物車操作 --------------------
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

function getCartTotal() {
  return CART.reduce((sum, p) => sum + p.price * p.qty, 0);
}

// -------------------- Toast --------------------
function toast(el, msg, ok = true) {
  el.textContent = msg || "";
  el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
}
