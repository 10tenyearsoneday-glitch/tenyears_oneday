(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;

  /* =========================
     基本設定
  ========================= */
  const CART_KEY = "ten_cart";
  const GAS_PRODUCTS_URL =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  const $ = (id) => document.getElementById(id);
  const money = (n) => `NT$ ${Math.round(Number(n || 0))}`;

  /* =========================
     Settings（背景抓取，不阻塞 header）
  ========================= */
  let __TEN_SETTINGS = null;
  let __TEN_SETTINGS_LOADING = false;

  async function getSettings({ force = false } = {}) {
    if (!force && __TEN_SETTINGS) return __TEN_SETTINGS;
    if (__TEN_SETTINGS_LOADING) return __TEN_SETTINGS || {};

    __TEN_SETTINGS_LOADING = true;
    try {
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=settings`, {
        cache: "no-store",
      });
      const out = await res.json().catch(() => null);
      if (out?.ok && out.data) {
        __TEN_SETTINGS = out.data;
      } else {
        __TEN_SETTINGS = __TEN_SETTINGS || {}; // 保留舊值
      }
    } catch (e) {
      console.warn("getSettings failed", e);
      __TEN_SETTINGS = __TEN_SETTINGS || {};
    } finally {
      __TEN_SETTINGS_LOADING = false;
    }
    return __TEN_SETTINGS || {};
  }

  /* =========================
     工具
  ========================= */
  function normalizeQty(n) {
    n = Number(n || 1);
    if (!Number.isFinite(n) || n < 1) n = 1;
    return Math.floor(n);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, "");
  }

  function num(v, def = 0) {
    const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : def;
  }

  function truthy(v) {
    // TRUE / true / 1 / "1"
    return v === true || v === 1 || v === "1" || String(v).toUpperCase() === "TRUE";
  }

  /* =========================
     Cart storage
  ========================= */
  function readCart() {
    try {
      const arr = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart:changed"));
  }

  function cartCount() {
    return readCart().reduce((s, it) => s + normalizeQty(it.qty), 0);
  }

  /* =========================
     Public API
  ========================= */
  window.TEN = window.TEN || {};
  window.TEN.readCart = readCart;
  window.TEN.writeCart = writeCart;
  window.TEN.getSettings = () => (__TEN_SETTINGS || null);

  window.TEN.addToCart
