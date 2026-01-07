<script>
/* =========================
   全站共用 include.js（定版）
   原結構保留，只加會員補丁
========================= */

(function () {
  // ========= 基本設定 =========
  const LS_TOKEN = "ten_member_token";
  const LS_MEMBER_ID = "ten_member_id";

  // ========= 安全 DOMReady（不覆蓋別人） =========
  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ========= Header 注入（保留你原本的） =========
  async function injectHeader() {
    const res = await fetch("./header.html");
    const html = await res.text();
    document.body.insertAdjacentHTML("afterbegin", html);
  }

  // ========= 會員狀態顯示（只加，不改） =========
  function applyMemberUI() {
    const token = localStorage.getItem(LS_TOKEN);
    const memberId = localStorage.getItem(LS_MEMBER_ID);

    const loginBtn = document.querySelector("[data-login]");
    const memberBtn = document.querySelector("[data-member]");
    const logoutBtn = document.querySelector("[data-logout]");

    if (token && memberId) {
      loginBtn && (loginBtn.style.display = "none");
      memberBtn && (memberBtn.style.display = "");
      logoutBtn && (logoutBtn.style.display = "");
    } else {
      loginBtn && (loginBtn.style.display = "");
      memberBtn && (memberBtn.style.display = "none");
      logoutBtn && (logoutBtn.style.display = "none");
    }
  }

  // ========= 登出（不動購物車） =========
  function bindLogout() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-logout]");
      if (!btn) return;

      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_MEMBER_ID);
      location.href = "member.html";
    });
  }

  // ========= 啟動 =========
  onReady(async () => {
    try {
      await injectHeader();
    } catch (e) {
      console.warn("Header inject failed", e);
    }

    // ⚠️ 這裡「不動」你原本的購物車初始化
    // 原本 cart.js / inline script 會自己跑

    applyMemberUI();
    bindLogout();
  });

})();
</script>
