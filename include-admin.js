// include-admin.js
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // Buttons
  const btnReload = $("btnReload");
  const btnAddProduct = $("btnAddProduct");

  // Toast
  const toastProducts = $("toastProducts");

  // Products table
  const tblProducts = $("tblProducts");

  // Modal
  const modal = $("modal");
  const modalTitle = $("modalTitle");
  const modalHint = $("modalHint");
  const btnCancel = $("btnCancel");
  const btnDelete = $("btnDelete");
  const btnSave = $("btnSave");

  // Product fields
  const pId = $("pId");
  const pName = $("pName");
  const pPrice = $("pPrice");
  const pStock = $("pStock");
  const pDesc = $("pDesc");

  let PRODUCTS = [];
  let editingId = null;

  // Helpers
  function toast(el, msg, ok = true) {
    el.textContent = msg || "";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
  }

  function closeModal() {
    modal.classList.remove("open");
  }

  // Events
  if (btnReload) {
    btnReload.addEventListener("click", async () => {
      await loadProducts();
    });
  }

  if (btnAddProduct) {
    btnAddProduct.addEventListener("click", () => openModal("add", null));
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", closeModal);
  }

  if (btnSave) {
    btnSave.addEventListener("click", saveProduct);
  }

  if (btnDelete) {
    btnDelete.addEventListener("click", deleteProduct);
  }

  if (modal) {
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  }

  // Init
  (async () => {
    await loadProducts();
  })();

  // ---------------- API Functions ----------------
  async function loadProducts() {
    toast(toastProducts, "載入商品中…");
    try {
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=products`, { cache: "no-store" });
      const data = await res.json().catch(() => ([]));
      PRODUCTS = Array.isArray(data) ? data : [];
      renderProducts();
      toast(toastProducts, `載入完成：${PRODUCTS.length} 件商品`);
    } catch (e) {
      console.error(e);
      toast(toastProducts, "載入失敗", false);
    }
  }

  function renderProducts() {
    if (!PRODUCTS.length) {
      tblProducts.innerHTML = `<tr><td class="muted">目前沒有商品</td></tr>`;
      return;
    }
    tblProducts.innerHTML = PRODUCTS.map(rowProductHtml).join("");
    tblProducts.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit");
        const item = PRODUCTS.find(x => String(x.id) === String(id));
        if (item) openModal("edit", item);
      });
    });
  }

  function rowProductHtml(p) {
    const id = String(p.id || "");
    const name = String(p.name || "");
    const price = Number(p.price || 0);
    const stock = Number(p.stock || 0);
    return `
      <tr class="row">
        <td style="width:150px;">
          <div style="font-weight:800;">${name}</div>
          <div class="mini">ID：${id}</div>
        </td>
        <td>
          <div class="mini">價格：${price}</div>
          <div class="mini">庫存：${stock}</div>
        </td>
        <td style="width:120px;text-align:right;">
          <button class="btn2 secondary" type="button" data-edit="${id}">編輯</button>
        </td>
      </tr>
    `;
  }

  function openModal(mode, item) {
    modal.classList.add("open");
    if (mode === "add") {
      editingId = null;
      modalTitle.textContent = "新增商品";
      btnDelete.style.display = "none";
      modalHint.textContent = "新增時 ID 不可重複。";
      pId.disabled = false;
      pId.value = "";
      pName.value = "";
      pPrice.value = 0;
      pStock.value = 0;
      pDesc.value = "";
    } else {
      editingId = String(item.id || "");
      modalTitle.textContent = `編輯商品：${editingId}`;
      btnDelete.style.display = "inline-flex";
      modalHint.textContent = "編輯時不建議改 ID。";
      pId.disabled = true;
      pId.value = editingId;
      pName.value = String(item.name || "");
      pPrice.value = Number(item.price ?? 0);
      pStock.value = Number(item.stock ?? 0);
      pDesc.value = String(item.desc || "");
    }
  }

  function buildProductPayload() {
    return {
      id: String(pId.value || "").trim(),
      name: String(pName.value || "").trim(),
      price: Number(pPrice.value || 0),
      stock: Number(pStock.value || 0),
      desc: String(pDesc.value || "")
    };
  }

  async function saveProduct() {
    toast(toastProducts, "");
    try {
      const payload = buildProductPayload();
      if (!payload.id || !payload.name) {
        toast(toastProducts, "請填商品 ID 和名稱", false);
        return;
      }
      if (editingId === null) {
        await gasPost("products", "POST", payload);
        closeModal();
        await loadProducts();
        toast(toastProducts, "新增成功 ✅");
      } else {
        await gasPost("products", "PUT", payload, editingId);
        closeModal();
        await loadProducts();
        toast(toastProducts, "儲存成功 ✅");
      }
    } catch (e) {
      console.error(e);
      toast(toastProducts, "儲存失敗", false);
    }
  }

  async function deleteProduct() {
    if (!editingId) return;
    const ok = confirm(`確定刪除商品 ${editingId} 嗎？`);
    if (!ok) return;
    try {
      await gasPost("products", "DELETE", {}, editingId);
      closeModal();
      await loadProducts();
      toast(toastProducts, "刪除成功 ✅");
    } catch (e) {
      console.error(e);
      toast(toastProducts, "刪除失敗", false);
    }
  }
});
