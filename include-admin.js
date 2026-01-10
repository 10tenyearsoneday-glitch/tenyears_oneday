// include-admin.js
// 專門給 admin.html 使用，商品管理（新增 / 編輯 / 刪除）

document.addEventListener("DOMContentLoaded", async () => {
  const tbl = document.getElementById("tbl");
  const toast = document.getElementById("toast");

  // 載入商品清單
  async function loadProducts() {
    try {
      const products = await fetchProducts(); // 從 include-common.js
      let html = `
        <tr><th>ID</th><th>名稱</th><th>價格</th><th>庫存</th><th>操作</th></tr>
      `;
      html += products.map(p => `
        <tr>
          <td>${p.id}</td>
          <td>${p.title}</td>
          <td>NT$ ${p.price}</td>
          <td>${p.stock ?? "-"}</td>
          <td>
            <button class="edit-product" 
              data-id="${p.id}" 
              data-title="${p.title}" 
              data-price="${p.price}" 
              data-stock="${p.stock}">編輯</button>
            <button class="del-product" data-id="${p.id}">刪除</button>
          </td>
        </tr>
      `).join("");
      tbl.innerHTML = html;
      toast.textContent = "✅ 商品清單已載入";
      toast.style.color = "green";
    } catch (e) {
      console.error(e);
      tbl.innerHTML = `<tr><td colspan="5">載入失敗</td></tr>`;
      toast.textContent = "❌ 載入商品失敗";
      toast.style.color = "red";
    }
  }

  // 新增商品
  document.querySelector("button.add-product")?.addEventListener("click", () => {
    openModal("新增商品", [
      { label: "商品名稱", type: "text", name: "title" },
      { label: "價格", type: "number", name: "price" },
      { label: "庫存", type: "number", name: "stock" }
    ], async (data) => {
      const out = await addProduct(data);
      if (out?.ok) {
        toast.textContent = "✅ 商品已新增";
        toast.style.color = "green";
        loadProducts();
      } else {
        toast.textContent = "❌ 新增商品失敗";
        toast.style.color = "red";
      }
    });
  });

  // 刪除商品
  tbl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".del-product");
    if (!btn) return;
    const id = btn.dataset.id;
    openModal("刪除商品", [
      { label: "確定要刪除商品？", type: "hidden", name: "id", value: id }
    ], async () => {
      const out = await deleteProduct(id);
      if (out?.ok) {
        toast.textContent = "✅ 商品已刪除";
        toast.style.color = "green";
        loadProducts();
      } else {
        toast.textContent = "❌ 刪除商品失敗";
        toast.style.color = "red";
      }
    });
  });

  // 編輯商品
  tbl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".edit-product");
    if (!btn) return;
    openModal("編輯商品", [
      { label: "商品名稱", type: "text", name: "title", value: btn.dataset.title },
      { label: "價格", type: "number", name: "price", value: btn.dataset.price },
      { label: "庫存", type: "number", name: "stock", value: btn.dataset.stock }
    ], async (data) => {
      const out = await updateProduct({ id: btn.dataset.id, ...data });
      if (out?.ok) {
        toast.textContent = "✅ 商品已更新";
        toast.style.color = "green";
        loadProducts();
      } else {
        toast.textContent = "❌ 更新商品失敗";
        toast.style.color = "red";
      }
    });
  });

  // 綁定「重新載入」按鈕
  document.querySelector("button.reload")?.addEventListener("click", loadProducts);

  // 初始載入
  loadProducts();
});
