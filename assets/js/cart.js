// === Cart badge 顯示/隱藏 ===
document.addEventListener("DOMContentLoaded", () => {
  const badge = document.getElementById("cartCount");

  window.setCartCount = function (n) {
    if (!badge) return;

    if (n && n > 0) {
      badge.hidden = false;
      badge.textContent = String(n);
    } else {
      badge.hidden = true;
      badge.textContent = "";
    }
  };
});
