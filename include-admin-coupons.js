// include-admin-coupons.js
// 專門給 admin-coupons.html 使用，優惠碼管理（新增 / 編輯 / 刪除）

document.addEventListener("DOMContentLoaded", async () => {
  const tbl = document.getElementById("tbl");
  const toast = document.getElementById("toast");

  // 載入優惠碼清單
  async function loadCoupons() {
    try {
      const coupons = await fetchCoupons(); // 從 include-common.js
      let html = `
        <tr><th>代碼</th><th>折扣</th><th>備註</th><th>操作</th></tr>
      `;
      html += coupons.map(c => `
        <tr>
          <td>${c.code}</td>
          <td>${c.discount}</td>
          <td>${c.note ?? ""}</td>
          <td>
            <button class="edit-coupon" 
              data-code="${c.code}" 
              data-discount="${c.discount}" 
              data-note="${c.note ?? ""}">編輯</button>
            <button class="del-coupon" data-code="${c.code}">刪除</button>
          </td>
        </tr>
      `).join("");
      tbl.innerHTML = html;
      toast.textContent = "✅ 優惠碼清單已載入";
      toast.style.color = "green";
    } catch (e) {
      console.error(e);
      tbl.innerHTML = `<tr><td colspan="4">載入失敗</td></tr>`;
      toast.textContent = "❌ 載入優惠碼失敗";
      toast.style.color = "red";
    }
  }

  // 新增優惠碼
  document.querySelector("button.add-coupon")?.addEventListener("click", () => {
    openModal("新增優惠碼", [
      { label: "優惠碼", type: "text", name: "code" },
      { label: "折扣金額", type: "number", name: "discount" },
      { label: "備註", type: "text", name: "note" }
    ], async (data) => {
      const out = await addCoupon(data);
      if (out?.ok) {
        toast.textContent = "✅ 優惠碼已新增";
        toast.style.color = "green";
        loadCoupons();
      } else {
        toast.textContent = "❌ 新增優惠碼失敗";
        toast.style.color = "red";
      }
    });
  });

  // 編輯優惠碼
  tbl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".edit-coupon");
    if (!btn) return;
    openModal("編輯優惠碼", [
      { label: "折扣金額", type: "number", name: "discount", value: btn.dataset.discount },
      { label: "備註", type: "text", name: "note", value: btn.dataset.note }
    ], async (data) => {
      const out = await updateCoupon({ code: btn.dataset.code, ...data });
      if (out?.ok) {
        toast.textContent = "✅ 優惠碼已更新";
        toast.style.color = "green";
        loadCoupons();
      } else {
        toast.textContent = "❌ 更新優惠碼失敗";
        toast.style.color = "red";
      }
    });
  });

  // 刪除優惠碼
  tbl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".del-coupon");
    if (!btn) return;
    const code = btn.dataset.code;
    openModal("刪除優惠碼", [
      { label: `確定要刪除優惠碼 ${code}？`, type: "hidden", name: "code", value: code }
    ], async () => {
      const out = await deleteCoupon(code);
      if (out?.ok) {
        toast.textContent = "✅ 優惠碼已刪除";
        toast.style.color = "green";
        loadCoupons();
      } else {
        toast.textContent = "❌ 刪除優惠碼失敗";
        toast.style.color = "red";
      }
    });
  });

  // 綁定「重新載入」按鈕
  document.querySelector("button.reload")?.addEventListener("click", loadCoupons);

  // 初始載入
  loadCoupons();
});
