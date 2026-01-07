/* include.js — SAFE PATCH (based on your OLD version)
   原則：
   - 不覆蓋整個 DOM
   - 不假設元素一定存在
   - header 失敗不影響頁面
*/

(() => {
  if (window.__TEN_INCLUDE_SAFE__) return;
  window.__TEN_INCLUDE_SAFE__ = true;

  // ========= 基本工具 =========
  const $ = (id) => document.getElementById(id);

  const CART_KEY = "ten_cart";

  function readCart() {
    try {
      const v = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  function cartCount() {
    return readCart().reduce((s, it) => s + Number(it.qty || 1), 0);
  }

  // ========= Header 載入（不破壞） =========
  async function loadHeaderSafe() {
    if (document.documentElement.dataset.headerLoaded === "1") return;
    document.documentElement.dataset.headerLoaded = "1";

    try {
      const res = await fetch("./header.html", { cache: "no-store" });
      if (!res.ok) return;

      const html = await res.text();
      // ⚠️ 只插入，不清空任何東西
      document.body.insertAdjacentHTML("afterbegin", html);
    } catch {
      // header 失敗 → 忽略
    }
  }

  // ========= Badge =========
  function renderCartBadgeSafe() {
    const badge = $("cartCount");
    if (!badge) return;

    const n = cartCount();
    if (n > 0) {
      badge.textContent = n;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  // ========= Drawer（存在才綁） =========
  function bindCartOpenSafe() {
    const cartBtn = document.querySelector('.icon-row a[data-icon="cart"]');
    const drawer = $("cartDrawer");
    const backdrop = $("cartBackdrop");

    if (!cartBtn || !drawer || !backdrop) return;

    cartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      backdrop.hidden = false;
      drawer.hidden = false;
    });

    backdrop.addEventListener("click", () => {
      backdrop.hidden = true;
      drawer.hidden = true;
    });
  }

  // ========= 初始化 =========
  window.addEventListener("DOMContentLoaded", async () => {
    await loadHeaderSafe();
    renderCartBadgeSafe();
    bindCartOpenSafe();

    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY) renderCartBadgeSafe();
    });
  });
})();
