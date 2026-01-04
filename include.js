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
// include.js 最後面加
(function(){
  const CART_KEY = "ten_cart";
  function countCart(){
    try{
      const arr = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if(!Array.isArray(arr)) return 0;
      return arr.reduce((s,x)=>s+Math.max(1,Number(x.qty||1)),0);
    }catch(e){ return 0; }
  }
  function render(){
    const el = document.getElementById("cartCount");
    if(!el) return;
    const n = countCart();
    el.textContent = n > 0 ? String(n) : "";
    el.style.display = n > 0 ? "inline-flex" : "none";
  }
  window.addEventListener("cart:changed", render);
  render();
})();
