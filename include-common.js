// include-common.js
// 共用設定：前台與後台都會用到

// ⚠️ 請改成你自己的 Google Apps Script 部署網址
const API_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

// 後台管理需要的密鑰（建議只在後台頁面使用，前台不要暴露）
const ADMIN_KEY = "你的管理密鑰";

// -------------------- Products --------------------
async function fetchProducts() {
  const res = await fetch(`${API_URL}?path=products`, { cache: "no-store" });
  return res.json();
}

async function addProduct(data) {
  const res = await fetch(`${API_URL}?path=products&method=POST&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

async function updateProduct(data) {
  const res = await fetch(`${API_URL}?path=products&method=PUT&id=${encodeURIComponent(data.id)}&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

async function deleteProduct(id) {
  const res = await fetch(`${API_URL}?path=products&method=DELETE&id=${encodeURIComponent(id)}&key=${ADMIN_KEY}`, {
    method: "POST"
  });
  return res.json();
}

// -------------------- Coupons --------------------
async function fetchCoupons() {
  const res = await fetch(`${API_URL}?path=coupons`, { cache: "no-store" });
  return res.json();
}

async function addCoupon(data) {
  const res = await fetch(`${API_URL}?path=coupons&method=POST&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

async function updateCoupon(data) {
  const res = await fetch(`${API_URL}?path=coupons&method=PUT&id=${encodeURIComponent(data.code)}&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

async function deleteCoupon(code) {
  const res = await fetch(`${API_URL}?path=coupons&method=DELETE&id=${encodeURIComponent(code)}&key=${ADMIN_KEY}`, {
    method: "POST"
  });
  return res.json();
}

// -------------------- Shipping / Settings --------------------
async function fetchSettings() {
  const res = await fetch(`${API_URL}?path=settings`, { cache: "no-store" });
  return res.json();
}

async function updateSettings(data) {
  const res = await fetch(`${API_URL}?path=settings_update&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

// -------------------- 共用工具 --------------------
const $ = (id) => document.getElementById(id);

function toast(el, msg, ok = true) {
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
}
