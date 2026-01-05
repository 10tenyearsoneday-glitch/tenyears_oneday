// include.js (完整取代版)
// - 插入 header.html
// - nav/icon active
// - 右上角購物車 badge (#cartCount) with ten_cart
// - 監聽 cart:changed / storage 同步更新

const CART_KEY = "ten_cart";

async function loadHeader() {
  // 防止重複插入（有些頁面可能重複載入 include.js 或 hot reload）
  if (document.documentElement.dataset.headerLoaded === "1") return;
  document.documentElement.dataset.headerLoaded = "1";

  try {
    const res = await fetch("header.html", { cache: "no-store" });
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

    // ✅ 確保購物車 badge 存在（header.html 若還沒加 span#cartCount，也不會壞）
    ensureCartBadgeNode();

  } catch (e) {
    console.warn("loadHeader failed:", e);
  }
}

function ensureCartBadgeNode() {
  // 已存在就不處理
  if (document.getElementById("cartCount")) return;

  // 找購物車 icon 的 a
  const cartA = document.querySelector('.icon-row a[data-icon="cart"]');
  if (!cartA) return;

  const span = document.createElement("span");
  span.id = "cartCount";
  span.className = "cart-badge";
  span.style.display = "none";
  cartA.appendChild(span);
}

function readCartCount() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return 0;

    // qty 最少 0（你用的是 qty>=1 的結構也OK）
    return arr.reduce((sum, x) => sum + Math.max(0, Number(x.qty || 0)), 0);
  } catch (e) {
    return 0;
  }
}

function renderCartBadge() {
  const el = document.getElementById("cartCount");
  if (!el) return;

  const n = readCartCount();
  if (n > 0) {
    el.textContent = String(n);
    el.style.display = "inline-flex";
  } else {
    el.textContent = "";
    el.style.display = "none";
  }
}

// ✅ 對外提供：任何頁面寫完購物車後呼叫 window.dispatchEvent(new Event("cart:changed"))
function bindCartBadgeListeners() {
  window.addEventListener("cart:changed", renderCartBadge);

  // 跨分頁同步
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) renderCartBadge();
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadHeader();      // 先插入 header
  renderCartBadge();       // 再畫 badge（避免你原本那種先跑 badge 找不到節點）
  bindCartBadgeListeners();
});
