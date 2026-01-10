document.addEventListener("DOMContentLoaded", async () => {
  const tbl = document.getElementById("tbl");
  const toast = document.getElementById("toast");

  // 載入優惠碼清單
  async function loadCoupons() {
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
  }

  // 綁定「新增優惠碼」按鈕
  document.querySelector("button.add-coupon")?.addEventListener("click", async () => {
    const code = prompt("優惠碼：").toUpperCase();
    const discount = Number(prompt("折扣金額："));
    const note = prompt("備註：");
    if (!code || !discount) return alert("❌ 請輸入完整資料");

    try {
      const out = await addCoupon({ code, discount, note });
      if (out?.ok) {
        toast.textContent = "✅ 優惠碼已新增";
        toast.style.color = "green";
        loadCoupons();
      } else {
        toast.textContent = "❌ 新增優惠碼失敗";
        toast.style.color = "red";
      }
    } catch (e) {
      console.error(e);
      toast.textContent = "❌ 系統錯誤";
      toast.style.color = "red";
    }
  });

  // 綁定「重新載入」按鈕
  document.querySelector("button.reload")?.addEventListener("click", loadCoupons);

  // 初始載入
  loadCoupons();
});
