// include-common.js
const API_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
const ADMIN_KEY = "10years1day911321"; // 後台管理密鑰

// -------------------- Products --------------------
async function fetchProducts() {
  const res = await fetch(`${API_URL}?path=products`);
  return res.json();
}

async function addProduct(data) {
  const res = await fetch(`${API_URL}?path=products&method=POST&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

async function updateProduct(data) {
  const res = await fetch(`${API_URL}?path=products&method=PUT&id=${encodeURIComponent(data.id)}&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

async function deleteProduct(id) {
  const res = await fetch(`${API_URL}?path=products&method=DELETE&id=${encodeURIComponent(id)}&key=${ADMIN_KEY}`, {
    method: "POST"
  });
  return res.json();
}

// -------------------- Coupons --------------------
async function fetchCoupons() {
  const res = await fetch(`${API_URL}?path=coupons`);
  return res.json();
}

async function addCoupon(data) {
  const res = await fetch(`${API_URL}?path=coupons&method=POST&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

async function updateCoupon(data) {
  const res = await fetch(`${API_URL}?path=coupons&method=PUT&id=${encodeURIComponent(data.code)}&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

async function deleteCoupon(code) {
  const res = await fetch(`${API_URL}?path=coupons&method=DELETE&id=${encodeURIComponent(code)}&key=${ADMIN_KEY}`, {
    method: "POST"
  });
  return res.json();
}

// -------------------- Shipping / Settings --------------------
async function fetchShipping() {
  const res = await fetch(`${API_URL}?path=settings`);
  return res.json();
}

async function addShipping(data) {
  const res = await fetch(`${API_URL}?path=settings_update&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

async function updateShipping(data) {
  const res = await fetch(`${API_URL}?path=settings_update&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.json();
}

async function deleteShipping(region) {
  // 刪除運費其實就是更新 settings，把該 region 設定移除或設為 0
  const res = await fetch(`${API_URL}?path=settings_update&key=${ADMIN_KEY}`, {
    method: "POST",
    body: JSON.stringify({ region, fee: 0 })
  });
  return res.json();
}

// -------------------- Modal 共用 --------------------
function openModal(title, fields, onSubmit) {
  const modal = document.getElementById("modal");
  const backdrop = document.getElementById("modalBackdrop");
  const modalTitle = document.getElementById("modalTitle");
  const modalFields = document.getElementById("modalFields");
  const form = document.getElementById("modalForm");

  modalTitle.textContent = title;
  modalFields.innerHTML = fields.map(f => {
    if (f.type === "checkbox") {
      return `<label><input type="checkbox" name="${f.name}" ${f.value ? "checked" : ""}> ${f.label}</label>`;
    }
    return `<label>${f.label}<input type="${f.type}" name="${f.name}" value="${f.value ?? ""}" step="${f.step ?? ""}"></label>`;
  }).join("");

  backdrop.hidden = false;
  modal.hidden = false;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {};
    fields.forEach(f => {
      if (f.type === "checkbox") {
        data[f.name] = formData.get(f.name) === "on";
      } else {
        data[f.name] = formData.get(f.name);
      }
    });
    await onSubmit(data);
    backdrop.hidden = true;
    modal.hidden = true;
  };

  document.getElementById("modalCancel").onclick = () => {
    backdrop.hidden = true;
    modal.hidden = true;
  };
}
