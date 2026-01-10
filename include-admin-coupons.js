// include-admin-coupons.js
document.addEventListener("DOMContentLoaded", () => {
  const tblCoupons = document.getElementById("tblCoupons");
  const tblShipping = document.getElementById("tblShipping");
  const toast = document.getElementById("toast");

  // -------------- Data loaders --------------
  async function loadCoupons() {
    try {
      const coupons = await fetchCoupons(); // from include-common.js
      console.log("coupons API:", coupons);

      let rows = [];
      if (Array.isArray(coupons)) {
        rows = coupons;
      } else if (coupons && Array.isArray(coupons.data)) {
        rows = coupons.data;
      } else if (coupons && coupons.ok === false) {
        // backend error surface
        showToast(`❌ 載入優惠碼失敗：${coupons.error || "UNKNOWN"}`, "red");
      }

      const header = `
        <tr>
          <th>代碼</th>
          <th>類型</th>
          <th>折扣</th>
          <th>最低消費</th>
          <th>啟用</th>
          <th>一次每人</th>
          <th>操作</th>
        </tr>
      `;
      const body = rows.map(couponHtml).join("");
      tblCoupons.innerHTML = header + body;
      if (!rows.length) {
        tblCoupons.insertAdjacentHTML("beforeend", `<tr><td colspan="7">（沒有資料）</td></tr>`);
      }
    } catch (err) {
      console.error(err);
      tblCoupons.innerHTML = `<tr><td colspan="7">載入失敗</td></tr>`;
      showToast("❌ 載入優惠碼失敗", "red");
    }
  }

  function couponHtml(c) {
    const type = c.type ?? (c.rate != null ? "rate" : (c.amount != null ? "amount" : "-"));
    const discountText = type === "rate"
      ? `${Math.round(Number(c.rate ?? 1) * 100)}%`
      : `NT$ ${Number(c.amount ?? 0)}`;
    return `
      <tr>
        <td>${escapeHtml(c.code)}</td>
        <td>${escapeHtml(type)}</td>
        <td>${discountText}</td>
        <td>${Number(c.minSpend ?? 0)}</td>
        <td>${c.enabled ? "✅" : "—"}</td>
        <td>${c.oncePerMember ? "✅" : "—"}</td>
        <td>
          <button class="edit-coupon"
                  data-code="${escapeAttr(c.code)}"
                  data-type="${escapeAttr(type)}"
                  data-rate="${escapeAttr(c.rate)}"
                  data-amount="${escapeAttr(c.amount)}"
                  data-minspend="${escapeAttr(c.minSpend)}"
                  data-enabled="${escapeAttr(c.enabled)}"
                  data-once="${escapeAttr(c.oncePerMember)}">編輯</button>
          <button class="del-coupon" data-code="${escapeAttr(c.code)}">刪除</button>
        </td>
      </tr>
    `;
  }

  async function loadShipping() {
    try {
      const shipping = await fetchShipping(); // from include-common.js
      console.log("shipping API:", shipping);

      let rows = [];
      if (Array.isArray(shipping)) {
        rows = shipping;
      } else if (shipping && Array.isArray(shipping.data)) {
        rows = shipping.data;
      } else if (shipping && shipping.ok === false) {
        showToast(`❌ 載入運費失敗：${shipping.error || "UNKNOWN"}`, "red");
      }

      const header = `
        <tr>
          <th>地區</th>
          <th>運費</th>
          <th>操作</th>
        </tr>
      `;
      const body = rows.map(shippingHtml).join("");
      tblShipping.innerHTML = header + body;
      if (!rows.length) {
        tblShipping.insertAdjacentHTML("beforeend", `<tr><td colspan="3">（沒有資料）</td></tr>`);
      }
    } catch (err) {
      console.error(err);
      tblShipping.innerHTML = `<tr><td colspan="3">載入失敗</td></tr>`;
      showToast("❌ 載入運費失敗", "red");
    }
  }

  function shippingHtml(s) {
    return `
      <tr>
        <td>${escapeHtml(s.region)}</td>
        <td>${Number(s.fee ?? 0)}</td>
        <td>
          <button class="edit-shipping"
                  data-region="${escapeAttr(s.region)}"
                  data-fee="${escapeAttr(s.fee)}">編輯</button>
          <button class="del-shipping"
                  data-region="${escapeAttr(s.region)}">刪除</button>
        </td>
      </tr>
    `;
  }

  // -------------- Actions: coupons --------------
  const btnAddCoupon = document.querySelector("button.add-coupon");
  if (btnAddCoupon) {
    btnAddCoupon.addEventListener("click", () => {
      openModal("新增優惠碼", [
        { label: "代碼", type: "text", name: "code" },
        { label: "類型（rate 或 amount）", type: "text", name: "type", value: "rate" },
        { label: "折扣率（0~1，type=rate）", type: "number", name: "rate", step: "0.01" },
        { label: "折扣金額（type=amount）", type: "number", name: "amount" },
        { label: "最低消費", type: "number", name: "minSpend", value: 0 },
        { label: "啟用", type: "checkbox", name: "enabled", value: true },
        { label: "一次每人", type: "checkbox", name: "oncePerMember", value: false }
      ], async (data) => {
        normalizeCouponPayload(data);
        const out = await addCoupon(data); // from include-common.js
        if (out?.ok) {
          showToast("✅ 優惠碼已新增", "green");
          loadCoupons();
        } else {
          showToast(`❌ 新增優惠碼失敗：${out?.error || ""}`, "red");
        }
      });
    });
  }

  tblCoupons.addEventListener("click", async (e) => {
    const delBtn = e.target.closest(".del-coupon");
    if (delBtn) {
      const code = delBtn.dataset.code;
      if (!code) return;
      const ok = confirm(`確定刪除優惠碼「${code}」？`);
      if (!ok) return;
      const out = await deleteCoupon(code); // from include-common.js
      if (out?.ok) {
        showToast("✅ 優惠碼已刪除", "green");
        loadCoupons();
      } else {
        showToast(`❌ 刪除優惠碼失敗：${out?.error || ""}`, "red");
      }
      return;
    }

    const editBtn = e.target.closest(".edit-coupon");
    if (editBtn) {
      const payload = {
        code: editBtn.dataset.code,
        type: editBtn.dataset.type,
        rate: editBtn.dataset.rate,
        amount: editBtn.dataset.amount,
        minSpend: editBtn.dataset.minspend,
        enabled: editBtn.dataset.enabled === "true",
        oncePerMember: editBtn.dataset.once === "true"
      };
      openModal("編輯優惠碼", [
        { label: "代碼", type: "text", name: "code", value: payload.code },
        { label: "類型（rate 或 amount）", type: "text", name: "type", value: payload.type },
        { label: "折扣率（0~1，type=rate）", type: "number", name: "rate", step: "0.01", value: payload.rate },
        { label: "折扣金額（type=amount）", type: "number", name: "amount", value: payload.amount },
        { label: "最低消費", type: "number", name: "minSpend", value: payload.minSpend },
        { label: "啟用", type: "checkbox", name: "enabled", value: payload.enabled },
        { label: "一次每人", type: "checkbox", name: "oncePerMember", value: payload.oncePerMember }
      ], async (data) => {
        normalizeCouponPayload(data);
        const out = await updateCoupon(data); // from include-common.js
        if (out?.ok) {
          showToast("✅ 優惠碼已更新", "green");
          loadCoupons();
        } else {
          showToast(`❌ 更新優惠碼失敗：${out?.error || ""}`, "red");
        }
      });
    }
  });

  // -------------- Actions: shipping --------------
  const btnAddShipping = document.querySelector("button.add-shipping");
  if (btnAddShipping) {
    btnAddShipping.addEventListener("click", () => {
      openModal("新增運費設定", [
        { label: "地區", type: "text", name: "region" },
        { label: "運費", type: "number", name: "fee" }
      ], async (data) => {
        data.region = String(data.region || "").trim();
        data.fee = Number(data.fee || 0);
        const out = await addShipping(data); // from include-common.js
        if (out?.ok) {
          showToast("✅ 運費已新增", "green");
          loadShipping();
        } else {
          showToast(`❌ 新增運費失敗：${out?.error || ""}`, "red");
        }
      });
    });
  }

  tblShipping.addEventListener("click", async (e) => {
    const delBtn = e.target.closest(".del-shipping");
    if (delBtn) {
      const region = delBtn.dataset.region;
      if (!region) return;
      const ok = confirm(`確定刪除地區「${region}」的運費設定？`);
      if (!ok) return;
      const out = await deleteShipping(region); // from include-common.js
      if (out?.ok) {
        showToast("✅ 運費已刪除", "green");
        loadShipping();
      } else {
        showToast(`❌ 刪除運費失敗：${out?.error || ""}`, "red");
      }
      return;
    }

    const editBtn = e.target.closest(".edit-shipping");
    if (editBtn) {
      const payload = {
        region: editBtn.dataset.region,
        fee: Number(editBtn.dataset.fee || 0)
      };
      openModal("編輯運費", [
        { label: "地區", type: "text", name: "region", value: payload.region },
        { label: "運費", type: "number", name: "fee", value: payload.fee }
      ], async (data) => {
        data.region = String(data.region || "").trim();
        data.fee = Number(data.fee || 0);
        const out = await updateShipping(data); // from include-common.js
        if (out?.ok) {
          showToast("✅ 運費已更新", "green");
          loadShipping();
        } else {
          showToast(`❌ 更新運費失敗：${out?.error || ""}`, "red");
        }
      });
    }
  });

  // -------------- Reload + init --------------
  document.querySelector("button.reload")?.addEventListener("click", () => {
    loadCoupons();
    loadShipping();
  });

  loadCoupons();
  loadShipping();

  // -------------- helpers --------------
  function showToast(text, color = "inherit") {
    if (!toast) return;
    toast.textContent = text;
    toast.style.color = color;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escapeAttr(s) {
    return String(s ?? "").replace(/"/g, "&quot;");
  }

  function normalizeCouponPayload(data) {
    data.code = String(data.code || "").trim().toUpperCase();
    data.type = String(data.type || "").trim();
    // Only one of rate/amount should matter based on type
    if (data.type === "rate") {
      data.rate = Number(data.rate || 0);
      data.amount = undefined;
    } else if (data.type === "amount") {
      data.amount = Number(data.amount || 0);
      data.rate = undefined;
    }
    data.minSpend = Number(data.minSpend || 0);
    data.enabled = !!data.enabled;
    data.oncePerMember = !!data.oncePerMember;
  }
});
