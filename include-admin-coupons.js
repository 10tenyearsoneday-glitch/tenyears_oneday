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
// 在載入優惠碼清單時，為每一列加上刪除按鈕
html += coupons.map(c => `
  <tr>
    <td>${c.code}</td>
    <td>${c.discount}</td>
    <td>${c.note ?? ""}</td>
    <td><button class="del-coupon" data-code="${c.code}">刪除</button></td>
  </tr>
`).join("");

// 綁定刪除事件
tbl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".del-coupon");
  if (!btn) return;
  const code = btn.dataset.code;
  if (!confirm(`確定要刪除優惠碼 ${code} 嗎？`)) return;

  try {
    const out = await deleteCoupon(code);
    if (out?.ok) {
      toast.textContent = "✅ 優惠碼已刪除";
      toast.style.color = "green";
      loadCoupons();
    } else {
      toast.textContent = "❌ 刪除優惠碼失敗";
      toast.style.color = "red";
    }
  } catch (e) {
    console.error(e);
    toast.textContent = "❌ 系統錯誤";
    toast.style.color = "red";
  }
});
// 在載入優惠碼清單時，為每一列加上「編輯」按鈕
html += coupons.map(c => `
  <tr>
    <td>${c.code}</td>
    <td>${c.discount}</td>
    <td>${c.note ?? ""}</td>
    <td>
      <button class="edit-coupon" data-code="${c.code}" data-discount="${c.discount}" data-note="${c.note}">編輯</button>
      <button class="del-coupon" data-code="${c.code}">刪除</button>
    </td>
  </tr>
`).join("");

// 綁定編輯事件
tbl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".edit-coupon");
  if (!btn) return;
  const code = btn.dataset.code;
  const discount = Number(prompt("折扣金額：", btn.dataset.discount));
  const note = prompt("備註：", btn.dataset.note);
  if (!code || !discount) return alert("❌ 請輸入完整資料");

  try {
    const out = await updateCoupon({ code, discount, note });
    if (out?.ok) {
      toast.textContent = "✅ 優惠碼已更新";
      toast.style.color = "green";
      loadCoupons();
    } else {
      toast.textContent = "❌ 更新優惠碼失敗";
      toast.style.color = "red";
    }
  } catch (e) {
    console.error(e);
    toast.textContent = "❌ 系統錯誤";
    toast.style.color = "red";
  }
});
