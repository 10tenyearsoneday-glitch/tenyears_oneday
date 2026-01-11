/**
 * include-common.js
 * 十年一日｜後台共用設定（CORS-safe）
 *
 * 提供：
 * - API_URL
 * - ADMIN_KEY
 * - 共用 fetch helper（統一 text/plain）
 *
 * ⚠️ 不包含 UI、不綁定頁面
 */

/* ===== 基本設定（請確認這兩個） ===== */
const API_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
const ADMIN_KEY = "10years1day911321";

/* ===== 共用工具 ===== */
function qs(obj = {}) {
  return Object.entries(obj)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

/**
 * 統一的 POST（避免 CORS preflight）
 */
async function gasPost(path, payload = {}, extraParams = {}) {
  const query = qs({
    path,
    key: ADMIN_KEY,
    ...extraParams
  });

  const res = await fetch(`${API_URL}?${query}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8" // ✅ 關鍵
    },
    body: JSON.stringify(payload || {})
  });

  const out = await res.json().catch(() => ({}));
  if (!res.ok || out?.error) {
    throw new Error(out?.error || "GAS_POST_FAILED");
  }
  return out;
}

/**
 * GET（讀取用）
 */
async function gasGet(path, params = {}) {
  const query = qs({ path, ...params });
  const res = await fetch(`${API_URL}?${query}`, { cache: "no-store" });
  return res.json();
}

/* ===== 下面是你原本用得到的 helper（全部改成安全版） ===== */

/* 優惠碼 */
async function addCoupon(data) {
  return gasPost("coupons", data, { method: "POST" });
}

async function updateCoupon(code, data) {
  return gasPost("coupons", data, { method: "PUT", id: code });
}

async function deleteCoupon(code) {
  return gasPost("coupons", {}, { method: "DELETE", id: code });
}

/* 設定 */
async function updateSettings(data) {
  // 你原本用 settings_update
  return gasPost("settings_update", data);
}

/* 其他頁如果有用到，可以繼續往下加，但「都用 gasPost」 */
