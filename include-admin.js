// include-admin.js
// 後台管理專用：商品 CRUD 與表單控制
// ⚠️ 請確認 admin.html 已經先載入 include-common.js

// DOM 元素
const tbl = document.getElementById("tbl");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalHint = document.getElementById("modalHint");

const fId = document.getElementById("fId");
const fStatus = document.getElementById("fStatus");
const fTitle = document.getElementById("fTitle");
const fCategory = document.getElementById("fCategory");
const fSeries = document.getElementById("fSeries");
const fPrice = document.getElementById("fPrice");
const fImage = document.getElementById("fImage");
const fDesc = document.getElementById("fDesc");
const fImages = document.getElementById("fImages");

const imgFile = document.getElementById("imgFile");
const imgSlug = document.getElementById("imgSlug");
const imgUrl  = document.getElementById("imgUrl");
const imgPreview = document.getElementById("imgPreview");
const copySlug = document.getElementById("copySlug");
const copyUrl  = document.getElementById("copyUrl");

const btnReload = document.getElementById("btnReload");
const btnAdd = document.getElementById("btnAdd");
const btnCancel = document.getElementById("btnCancel");
const btnDelete = document.getElementById("btnDelete");
const btnSave = document.getElementById("btnSave");

// 狀態
let PRODUCTS = [];
let editingId = null;

// 工具函式
function safeFileName(name){
  return String(name).trim().replace(/[^\w.\-]+/g, "-");
}

function updateImageUrlFromSlug(){
  const fileName = safeFileName(imgSlug.value || "");
  const full = fileName ? (IMG_BASE + encodeURIComponent(fileName)) : "";
  imgUrl.value = full;
  fImage.value = full;
}

// 事件：檔案選擇
imgFile?.addEventListener("change", () => {
  const f = imgFile.files?.[0];
  if(!f) return;

  const id = (fId.value || "").trim();
  const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
  const fileName = safeFileName((id ? id : f.name.replace(/\.[^.]+$/, "")) + "." + ext);

  imgSlug.value = fileName;
  updateImageUrlFromSlug();

  const url = URL.createObjectURL(f);
  imgPreview.src = url;
  imgPreview.style.display = "block";
});

imgSlug?.addEventListener("input", updateImageUrlFromSlug);
imgUrl?.addEventListener("input", () => { fImage.value = imgUrl.value.trim(); });

copySlug?.addEventListener("click", async () => {
  if(!imgSlug.value) return;
  await navigator.clipboard.writeText(imgSlug.value);
  showToast("已複製檔名");
});

copyUrl?.addEventListener("click", async () => {
  if(!imgUrl.value) return;
  await navigator.clipboard.writeText(imgUrl.value);
  showToast("已複製圖片網址");
});

// Modal 控制
function openModal(mode, item){
  modal.classList.add("open");

  if(mode === "add"){
    editingId = null;
    modalTitle.textContent = "新增商品";
    btnDelete.style.display = "none";
    modalHint.textContent = "新增時 id 不可重複。";
    fId.disabled = false;

    fId.value = "";
    fStatus.value = "上架";
    fTitle.value = "";
    fCategory.value = "其他";
    fSeries.value = "全系列";
    fPrice.value = 0;
    fImage.value = "";
    fDesc.value = "";
    imgSlug.value = "";
    imgUrl.value = "";
    imgPreview.style.display = "none";
    fImages.value = "";

  }else{
    editingId = item.id;
    modalTitle.textContent = `編輯商品：${item.id}`;
    btnDelete.style.display = "inline-block";
    modalHint.textContent = "編輯時 id 不建議改。";
    fId.disabled = true;

    fId.value = item.id || "";
    fStatus.value = item.status || "上架";
    fTitle.value = item.title || "";
    fCategory.value = item.category || "其他";
    fSeries.value = item.series || "全系列";
    fPrice.value = Number(item.price || 0);
    fImage.value = item.image || "";
    fDesc.value = item.desc || "";
    fImages.value = Array.isArray(item.images) ? item.images.join("\n") : String(item.images || "").trim();

    imgUrl.value = item.image || "";
    imgSlug.value = (item.image || "").split("/").pop() || "";
    if(item.image){
      imgPreview.src = item.image;
      imgPreview.style.display = "block";
    }else{
      imgPreview.style.display = "none";
    }
  }
}

function closeModal(){ modal.classList.remove("open"); }

// 渲染表格
function rowHtml(p){
  const img = p.image || PLACEHOLDER;
  const st = p.status || "上架";
  const stClass = (st === "上架") ? "pill on" : "pill off";
  return `
    <tr class="row">
      <td style="width:76px;">
        <div class="thumb-sm"><img src="${img}" alt="" loading="lazy"></div>
      </td>
      <td>
        <div style="font-weight:600;">${p.title || "（未命名）"}</div>
        <div class="mini">${p.series || "全系列"}｜${p.category || "其他"}｜<span class="${stClass}">${st}</span></div>
        <div class="mini">ID：${p.id}</div>
      </td>
      <td style="width:120px;text-align:right;font-weight:700;color:#6c7f67;">
        NT$ ${Number(p.price || 0)}
      </td>
      <td style="width:90px;text-align:right;">
        <button class="btn2 secondary" data-edit="${p.id}" type="button">編輯</button>
      </td>
    </tr>
  `;
}

function render(){
  tbl.innerHTML = PRODUCTS.map(rowHtml).join("");
  tbl.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const item = PRODUCTS.find(x => String(x.id) === String(id));
      if(item) openModal("edit", item);
    });
  });
}

// 載入商品
async function loadProducts(){
  showToast("載入商品中...");
  try{
    const res = await fetch(`${API_URL}?path=products`, { cache: "no-store" });
    const data = await res.json();
    PRODUCTS = Array.isArray(data) ? data : [];
    render();
    showToast(`載入完成：${PRODUCTS.length} 件商品`);
  }catch(e){
    console.error(e);
    showToast("載入失敗，請確認 GAS 是否正常", false);
  }
}

// 組合 payload
function buildPayload(){
  return {
    id: fId.value.trim(),
    status: fStatus.value,
    title: fTitle.value.trim(),
    category: fCategory.value,
    series: fSeries.value,
    price: Number(fPrice.value || 0),
    image: fImage.value.trim(),
    images: (fImages.value || "").trim(),
    desc: fDesc.value.trim()
  };
}

// 寫入 GAS
async function gasWrite(method, payload, id = "") {
  const url =
    `${API_URL}?path=products` +
    (id ? `&id=${encodeURIComponent(id)}` : "") +
    `&key=${encodeURIComponent(ADMIN_KEY)}` +
    `&method=${encodeURIComponent(method)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload || {})
  });

  const out = await res.json().catch(() => ({}));
  if (!res.ok || out?.error) throw new Error(out?.error || "GAS_WRITE_FAILED");
  return out;
}

// 新增/修改商品
async function saveProduct(){
  const payload = buildPayload();

  if(!payload.title){
    showToast("請填商品名稱", false);
    return;
  }
  if(editingId === null && !payload.id){
    showToast("新增商品必須填 id", false);
    return;
  }

  try{
    if(editingId === null){
      await gasWrite("POST", payload, "");
      closeModal();
      await loadProducts();
      showToast("新增成功");
    }
        }else{
      await gasWrite("PUT", payload, editingId);
      closeModal();
      await loadProducts();
      showToast("儲存成功");
    }
  }catch(e){
    console.error(e);
    showToast("儲存失敗（請看 Console / 檢查 ADMIN_KEY / GAS 寫入）", false);
  }
}

// 刪除商品
async function deleteProduct(){
  if(!editingId) return;
  const ok = confirm(`確定刪除商品 ${editingId} 嗎？`);
  if(!ok) return;

  try{
    await gasWrite("DELETE", {}, editingId);
    closeModal();
    await loadProducts();
    showToast("刪除成功");
  }catch(e){
    console.error(e);
    showToast("刪除失敗（請看 Console / 檢查 ADMIN_KEY / GAS 寫入）", false);
  }
}

// 綁定事件
btnReload.addEventListener("click", loadProducts);
btnAdd.addEventListener("click", () => openModal("add", null));
btnCancel.addEventListener("click", closeModal);
btnSave.addEventListener("click", saveProduct);
btnDelete.addEventListener("click", deleteProduct);

// 點擊 modal 背景關閉
modal.addEventListener("click", (e) => { if(e.target === modal) closeModal(); });

// 頁面初始化：載入商品
loadProducts();
