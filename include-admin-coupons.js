// include-admin-coupons.js
document.addEventListener("DOMContentLoaded", async () => {
  const tblCoupons = document.getElementById("tblCoupons");
  const tblShipping = document.getElementById("tblShipping");
  const toast = document.getElementById("toast");

  async function loadCoupons() {
    try {
      const coupons = await fetchCoupons();
      console.log("API 回傳:", coupons);

      let html = `<tr><th>代碼</th><th>折扣</th><th>操作</th></tr>`;
      if (Array.isArray(coupons)) {
        html += coupons.map(couponHtml).join("");
      } else if (coupons && Array.isArray(coupons.data)) {
        html += coupons.data.map(couponHtml).join("");
      } else {
        console.error("coupons 格式錯誤:", coupons);
        html += `<tr><td colspan="3">載入失敗</td></tr>`;
      }
      tblCoupons.innerHTML = html;
    } catch (e) {
      console.error(e);
      tblCoupons.innerHTML = `<tr><td colspan="3">載入失敗</td></tr>`;
    }
  }

  function couponHtml(c) {
    return `
      <tr>
        <td>${c.code}</td>
        <td>${c.discount}</td>
        <td>
          <button class="edit-coupon" data-code="${c.code}" data-discount="${c.discount}">編輯</button>
          <button class="del-coupon" data-code="${c.code}">刪除</button>
        </td>
      </tr>
    `;
  }

  async function loadShipping() {
    try {
      const shipping = await fetchShipping();
      console.log("API 回傳:", shipping);

      let html = `<tr><th>地區</th><th>運費</th><th>操作</th></tr>`;
      if (Array.isArray(shipping)) {
        html += shipping.map(shippingHtml).join("");
      } else if (shipping && Array.isArray(shipping.data)) {
        html += shipping.data.map(shippingHtml).join("");
      } else {
        console.error("shipping 格式錯誤:", shipping);
        html += `<tr><td colspan="3">載入失敗</td></tr>`;
      }
      tblShipping.innerHTML = html;
    } catch (e) {
      console.error(e);
      tblShipping.innerHTML = `<tr><td colspan="3">載入失敗</td></tr>`;
    }
  }

  function shippingHtml(s) {
    return `
      <tr>
        <td>${s.region}</td>
        <td>${s.fee}</td>
        <td>
          <button class="edit-shipping" data-region="${s.region}" data-fee="${s.fee}">編輯</button>
          <button class="del-shipping" data-region="${s.region}">刪除</button>
        </td>
      </tr>
    `;
  }

  // 綁定新增優惠碼
  document.querySelector("button.add-coupon")?.addEventListener("click", () => {
    openModal("新增優惠碼", [
      { label: "代碼", type: "text", name: "code" },
      { label: "折扣", type: "number", name: "discount" }
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

  // 綁定新增運費
  document.querySelector("button.add-shipping")?.addEventListener("click", () => {
    openModal("新增運費設定", [
      { label: "地區",
