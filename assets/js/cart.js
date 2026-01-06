document.addEventListener("DOMContentLoaded", () => {
  const badge = document.getElementById("cartCount");
  const CART_KEY = "cart";

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function calcCount(cart) {
    return cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  }

  // === 對外 API（其他 JS 可呼叫）===
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

  window.refreshCartBadge = function () {
    const cart = getCart();
    setCartCount(calcCount(cart));
  };

  // === 初始化（一進頁面就跑）===
  refreshCartBadge();
});
