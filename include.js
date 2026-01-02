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
