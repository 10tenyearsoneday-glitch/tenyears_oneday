document.addEventListener("DOMContentLoaded", async () => {
  const tbl = document.getElementById("tbl");
  const toast = document.getElementById("toast");

  try {
    const coupons = await fetchCoupons();
    let html = `
      <tr><th>代碼</th><th>折扣</th><th>備註</th></tr>
    `;
    html += coupons.map(c => `
      <tr>
        <td>${c.code}</td>
        <td>${c.discount}</td>
        <td>${c.note ?? ""}</td>
      </tr>
    `).join("");
    tbl.innerHTML = html;
    toast.textContent = "✅ 優惠碼清單已載入";
    toast.style.color = "green";
  } catch (e) {
    console.error(e);
    tbl.innerHTML = `<tr><td colspan="3">載入失敗</td></tr>`;
    toast.textContent = "❌ 載入優惠碼失敗";
    toast.style.color = "red";
  }
});
