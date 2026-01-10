document.addEventListener("DOMContentLoaded", async () => {
  const tbl = document.getElementById("tbl");
  const toast = document.getElementById("toast");

  // 載入商品清單
  async function loadProducts() {
    try {
      const products = await fetchProducts();
      let html = `
        <tr><th>ID</th><th>名稱</th><th>價格</th><th>庫存</th></tr>
      `;
      html += products.map(p => `
        <tr>
          <td>${p.id}</td>
          <td>${p.title}</td>
          <td>NT$ ${p.price}</td>
          <td>${p.stock ?? "-"}</td>
        </tr>
      `).join("");
      tbl.innerHTML = html;
      toast.textContent = "✅ 商品清單已載入";
      toast.style.color = "green";
    } catch (e) {
      console.error(e);
      tbl.innerHTML = `<tr><td colspan="4">載入失敗</td></tr>`;
      toast.textContent = "❌ 載入商品失敗";
      toast.style.color = "red";
    }
  }

  // 綁定「新增商品」按鈕
  document.querySelector("button.add-product")?.addEventListener("click", async () => {
    const title = prompt("商品名稱：");
    const price = Number(prompt("商品價格："));
    const stock = Number(prompt("庫存數量："));
    if (!title || !price) return alert("❌ 請輸入完整資料");

    try {
      const out = await addProduct({ title, price, stock });
      if (out?.ok) {
        toast.textContent = "✅ 商品已新增";
        toast.style.color = "green";
        loadProducts();
      } else {
        toast.textContent = "❌ 新增商品失敗";
        toast.style.color = "red";
      }
    } catch (e) {
      console.error(e);
      toast.textContent = "❌ 系統錯誤";
      toast.style.color = "red";
    }
  });

  // 綁定「重新載入」按鈕
  document.querySelector("button.reload")?.addEventListener("click", loadProducts);

  // 初始載入
  loadProducts();
});
// 在載入商品清單時，為每一列加上刪除按鈕
html += products.map(p => `
  <tr>
    <td>${p.id}</td>
    <td>${p.title}</td>
    <td>NT$ ${p.price}</td>
    <td>${p.stock ?? "-"}</td>
    <td><button class="del-product" data-id="${p.id}">刪除</button></td>
  </tr>
`).join("");

// 綁定刪除事件
tbl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".del-product");
  if (!btn) return;
  const id = btn.dataset.id;
  if (!confirm(`確定要刪除商品 ${id} 嗎？`)) return;

  try {
    const out = await deleteProduct(id);
    if (out?.ok) {
      toast.textContent = "✅ 商品已刪除";
      toast.style.color = "green";
      loadProducts();
    } else {
      toast.textContent = "❌ 刪除商品失敗";
      toast.style.color = "red";
    }
  } catch (e) {
    console.error(e);
    toast.textContent = "❌ 系統錯誤";
    toast.style.color = "red";
  }
});
// 在載入商品清單時，為每一列加上「編輯」按鈕
html += products.map(p => `
  <tr>
    <td>${p.id}</td>
    <td>${p.title}</td>
    <td>NT$ ${p.price}</td>
    <td>${p.stock ?? "-"}</td>
    <td>
      <button class="edit-product" data-id="${p.id}" data-title="${p.title}" data-price="${p.price}" data-stock="${p.stock}">編輯</button>
      <button class="del-product" data-id="${p.id}">刪除</button>
    </td>
  </tr>
`).join("");

// 綁定編輯事件
tbl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".edit-product");
  if (!btn) return;
  const id = btn.dataset.id;
  const title = prompt("商品名稱：", btn.dataset.title);
  const price = Number(prompt("商品價格：", btn.dataset.price));
  const stock = Number(prompt("庫存數量：", btn.dataset.stock));
  if (!title || !price) return alert("❌ 請輸入完整資料");

  try {
    const out = await updateProduct({ id, title, price, stock });
    if (out?.ok) {
      toast.textContent = "✅ 商品已更新";
      toast.style.color = "green";
      loadProducts();
    } else {
      toast.textContent = "❌ 更新商品失敗";
      toast.style.color = "red";
    }
  } catch (e) {
    console.error(e);
    toast.textContent = "❌ 系統錯誤";
    toast.style.color = "red";
  }
});
