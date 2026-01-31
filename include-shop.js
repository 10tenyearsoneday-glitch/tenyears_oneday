// include-shop.js — FINAL (with header loader + GAS unified)

(() => {
  if (window.TEN_SHOP_LOADED) return;
  window.TEN_SHOP_LOADED = true;

  // 🔗 你的單一 GAS
  const GAS =
    "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

  window.TEN = { GAS };

  // ====== Header 注入 ======
  fetch("./header.html")
    .then(r => r.text())
    .then(html => {
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      document.body.prepend(wrap);

      // 綁購物車 icon（如果有）
      bindCartIcon();
    })
    .catch(err => console.warn("header load failed", err));

  // ====== 小工具 ======
  function bindCartIcon() {
    const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
    if (!cartA) return;

    cartA.addEventListener("click", e => {
      e.preventDefault();
      if (typeof window.openDrawer === "function") window.openDrawer();
    });
  }

})();
