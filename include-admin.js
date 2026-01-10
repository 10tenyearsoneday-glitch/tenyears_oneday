// include-admin.js
// 專門給 admin.html 使用，避免和前台購物車邏輯混在一起

document.addEventListener("DOMContentLoaded", async () => {
  const tbl = document.getElementById("tbl");
  const toast = document.getElementById("toast");

  // 簡單測試：先顯示一行假資料
  if (tbl) {
    tbl.innerHTML = `
      <tr>
        <th>商品名稱</th>
        <th>價格</th>
        <th>庫存</th>
      </tr>
      <tr>
        <td>測試商品 A</td>
        <td>NT$ 100</td>
        <td>20</td>
      </tr>
    `;
  }

  // 顯示提示訊息
  if (toast) {
    toast.textContent = "✅ Admin.js 已載入，表格顯示測試資料";
    toast.style.color = "green";
  }

  // TODO: 之後可以改成 fetch Google Sheet 資料
  // const res = await fetch("你的 Google Apps Script URL");
  // const data = await res.json();
  // 然後用 data 填入表格
});
