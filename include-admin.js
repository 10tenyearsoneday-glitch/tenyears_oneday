document.addEventListener("DOMContentLoaded", async () => {
  const tbl = document.getElementById("tbl");
  const toast = document.getElementById("toast");

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
});
