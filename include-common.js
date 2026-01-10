// include-common.js
// 共用 API 呼叫模組

const GAS_PRODUCTS_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
const ADMIN_KEY = "10years1day911321";

// 抓商品清單
async function fetchProducts() {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=products_list`, { cache: "no-store" });
  return res.json();
}

// 抓優惠碼清單
async function fetchCoupons() {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=coupons_list`, { cache: "no-store" });
  return res.json();
}

// 新增商品
async function addProduct(product) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=product_add&key=${encodeURIComponent(ADMIN_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });
  return res.json();
}

// 新增優惠碼
async function addCoupon(coupon) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=coupon_add&key=${encodeURIComponent(ADMIN_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coupon)
  });
  return res.json();
}
// 刪除商品
async function deleteProduct(id) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=product_delete&key=${encodeURIComponent(ADMIN_KEY)}&id=${encodeURIComponent(id)}`, {
    method: "POST"
  });
  return res.json();
}

// 刪除優惠碼
async function deleteCoupon(code) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=coupon_delete&key=${encodeURIComponent(ADMIN_KEY)}&code=${encodeURIComponent(code)}`, {
    method: "POST"
  });
  return res.json();
}
// 編輯商品
async function updateProduct(product) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=product_update&key=${encodeURIComponent(ADMIN_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });
  return res.json();
}

// 編輯優惠碼
async function updateCoupon(coupon) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=coupon_update&key=${encodeURIComponent(ADMIN_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coupon)
  });
  return res.json();
}
