async function loadHeader() {
  const res = await fetch("header.html");
  const html = await res.text();

  // 插入在 body 開頭
  document.body.insertAdjacentHTML("afterbegin", html);

  // 取得目前頁面檔名
  const page = location.pathname.split("/").pop() || "index.html";

  // nav active
  const navKey = page.replace(".html", "");
  const navLink = document.querySelector(`.nav-row a[data-nav="${navKey}"]`);
  if (navLink) navLink.classList.add("active");

  // icon active（只在功能頁常駐）
  const iconMap = {
    "search.html": "search",
    "cart.html": "cart",
    "member.html": "member",
  };
  const iconKey = iconMap[page];
  if (iconKey) {
    const icon = document.querySelector(`.icon-row a[data-icon="${iconKey}"]`);
    if (icon) icon.classList.add("active");
  }
}

window.addEventListener("DOMContentLoaded", loadHeader);
// include.js 最後面（取代你原本的 IIFE）
(function(){
  const CART_KEY = "ten_cart";

  function readCartCount(){
    try{
      const raw = localStorage.getItem(CART_KEY);
      const arr = JSON.parse(raw || "[]");
      if(!Array.isArray(arr)) return 0;

      return arr.reduce(
        (sum, x) => sum + Math.max(0, Number(x.qty || 0)),
        0
      );
    }catch(e){
      return 0;
    }
  }

  function renderCartBadge(){
    const el = document.getElementById("cartCount");
    if(!el) return;

    const n = readCartCount();
    if(n > 0){
      el.textContent = String(n);
      el.style.display = "inline-flex";
    }else{
      el.textContent = "";
      el.style.display = "none";
    }
  }

  // 初始顯示（header 已插入後）
  renderCartBadge();

  // 同頁更新
  window.addEventListener("cart:changed", renderCartBadge);

  // 跨分頁 / 跨分頁同步
  window.addEventListener("storage", (e) => {
    if(e.key === CART_KEY) renderCartBadge();
  });
})();
