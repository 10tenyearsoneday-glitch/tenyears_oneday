// include-common.js
// 共用 API 呼叫模組，提供商品與優惠碼的 CRUD 操作

const GAS_PRODUCTS_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
const ADMIN_KEY = "10years1day911321";

// ========== 商品相關 ==========
async function fetchProducts() {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=products_list`, { cache: "no-store" });
  return res.json();
}

async function addProduct(product) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=product_add&key=${encodeURIComponent(ADMIN_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });
  return res.json();
}

async function updateProduct(product) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=product_update&key=${encodeURIComponent(ADMIN_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });
  return res.json();
}

async function deleteProduct(id) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=product_delete&key=${encodeURIComponent(ADMIN_KEY)}&id=${encodeURIComponent(id)}`, {
    method: "POST"
  });
  return res.json();
}

// ========== 優惠碼相關 ==========
async function fetchCoupons() {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=coupons_list`, { cache: "no-store" });
  return res.json();
}

async function addCoupon(coupon) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=coupon_add&key=${encodeURIComponent(ADMIN_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coupon)
  });
  return res.json();
}

async function updateCoupon(coupon) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=coupon_update&key=${encodeURIComponent(ADMIN_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coupon)
  });
  return res.json();
}

async function deleteCoupon(code) {
  const res = await fetch(`${GAS_PRODUCTS_URL}?path=coupon_delete&key=${encodeURIComponent(ADMIN_KEY)}&code=${encodeURIComponent(code)}`, {
    method: "POST"
  });
  return res.json();
}

// ========== 共用 Modal ==========
function openModal(title, fields, onSubmit) {
  const backdrop = document.getElementById("modalBackdrop");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalFields = document.getElementById("modalFields");
  const form = document.getElementById("modalForm");

  modalTitle.textContent = title;
  modalFields.innerHTML = fields.map(f => `
    <label>
      ${f.label}
      <input type="${f.type}" name="${f.name}" value="${f.value ?? ""}">
    </label>
  `).join("");

  backdrop.hidden = false;
  modal.hidden = false;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    await onSubmit(data);
    closeModal();
  };

  document.getElementById("modalCancel").onclick = closeModal;
}

function closeModal() {
  document.getElementById("modalBackdrop").hidden = true;
  document.getElementById("modal").hidden = true;
}
