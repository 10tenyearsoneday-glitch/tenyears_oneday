// include-admin-coupons.js
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // Tabs
  const tabs = document.querySelectorAll(".tab");
  const tabSettings = $("tabSettings");
  const tabCoupons = $("tabCoupons");

  // Buttons
  const btnReload = $("btnReload");
  const btnAddCoupon = $("btnAddCoupon");
  const btnSaveSettings = $("btnSaveSettings");

  // Toasts
  const toastSettings = $("toastSettings");
  const toastCoupons = $("toastCoupons");

  // Coupons table
  const tblCoupons = $("tblCoupons");

  // Modal
  const modal = $("modal");
  const modalTitle = $("modalTitle");
  const modalHint = $("modalHint");
  const btnCancel = $("btnCancel");
  const btnDelete = $("btnDelete");
  const btnSave = $("btnSave");

  // Coupon fields
  const cCode = $("cCode");
  const cEnabled = $("cEnabled");
  const cType = $("cType");
  const cRate = $("cRate");
  const cAmount = $("cAmount");
  const cMinSpend = $("cMinSpend");
  const cStartAt = $("cStartAt");
  const cEndAt = $("cEndAt");
  const cOnce = $("cOnce");
  const cMaxUses = $("cMaxUses");
  const cNote = $("cNote");

  // Settings fields
  const sShipEnabled = $("sShipEnabled");
  const sShipFee = $("sShipFee");
  const sFreeOver = $("sFreeOver");
  const sFirstRate = $("sFirstRate");
  const sBdayRate = $("sBdayRate");

  let COUPONS = [];
  let editingCode = null;

  // Helpers
  function toast(el, msg, ok = true) {
    el.textContent = msg || "";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
  }

  function switchTab(key) {
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === key));
    tabSettings.style.display = (key === "settings") ? "" : "none";
    tabCoupons.style.display = (key === "coupons") ? "" : "none";
  }

  function closeModal() {
    modal.classList.remove("open");
  }

  // Events
  tabs.forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));

  if (btnReload) {
    btnReload.addEventListener("click", async () => {
      await loadSettings();
      await loadCoupons();
    });
  }

  if (btnAddCoupon) {
    btnAddCoupon.addEventListener("click", () => openModal("add", null));
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", saveSettings);
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", closeModal);
  }

  if (btnSave) {
    btnSave.addEventListener("click", saveCoupon);
  }

  if (btnDelete) {
    btnDelete.addEventListener("click", deleteCoupon);
  }

  if (modal) {
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  }

  // Init
  (async () => {
    await loadSettings();
    await loadCoupons();
  })();

  // ---------------- API Functions ----------------
  async function loadSettings() {
    toast(toastSettings, "載入設定中…");
    try {
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=settings`, { cache: "no-store" });
      const s = await res.json().catch(() => ({}));

      sShipEnabled.value = String(!!(s.shipping_enabled === true || s.shipping_enabled === "TRUE" || s.shipping_enabled === "true"));
      sShipFee.value = Number(s.shipping_fee ?? 0);
      sFreeOver.value = Number(s.free_shipping_threshold ?? 0);
      sFirstRate.value = Number(s.first_purchase_discount ?? 1);
      sBdayRate.value = Number(s.birthday_discount ?? 1);

      toast(toastSettings, "設定已載入 ✅");
    } catch (e) {
      console.error(e);
      toast(toastSettings, "載入設定失敗", false);
    }
  }

  async function saveSettings() {
    toast(toastSettings, "儲存中…");
    try {
      const payload = {
        shipping_enabled: (sShipEnabled.value === "true"),
        shipping_fee: Number(sShipFee.value || 0),
        free_shipping_threshold: Number(sFreeOver.value || 0),
        first_purchase_discount: Number(sFirstRate.value || 1),
        birthday_discount: Number(sBdayRate.value || 1),
      };
      await gasPost("settings_update", "", payload);
      toast(toastSettings, "已儲存 ✅");
    } catch (e) {
      console.error(e);
      toast(toastSettings, "儲存失敗", false);
    }
  }

  async function loadCoupons() {
    toast(toastCoupons, "載入優惠碼中…");
    try {
      const res = await fetch(`${GAS_PRODUCTS_URL}?path=coupons`, { cache: "no-store" });
      const data = await res.json().catch(() => ([]));
      COUPONS = Array.isArray(data) ? data : [];
      renderCoupons();
      toast(toastCoupons, `載入完成：${COUPONS.length} 組`);
    } catch (e) {
      console.error(e);
      toast(toastCoupons, "載入失敗", false);
    }
  }

  function renderCoupons() {
    if (!COUPONS.length) {
      tblCoupons.innerHTML = `<tr><td class="muted">目前沒有優惠碼</td></tr>`;
      return;
    }
    tblCoupons.innerHTML = COUPONS.map(rowCouponHtml).join("");
    tblCoupons.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-edit");
        const item = COUPONS.find(x => String(x.code || "").toUpperCase() === String(code).toUpperCase());
        if (item) openModal("edit", item);
      });
    });
  }

  function rowCouponHtml(c) {
    const code = String(c.code || "").toUpperCase();
    const type = String(c.type || "");
    const rate = Number(c.rate || 0);
    const amount = Number(c.amount || 0);
    const minSpend = Number(c.minSpend || 0);
    const display = type === "rate" ? `打折 ${rate}` : type === "amount" ? `折抵 ${amount}` : type;
    return `
      <tr class="row">
        <td style="width:150px;">
          <div style="font-weight:800;">${code}</div>
          <div class="mini">${c.enabled ? "啟用" : "停用"}</div>
        </td>
        <td>
          <div class="mini">類型：${display}</div>
          <div class="mini">門檻：${minSpend > 0 ? ("滿 " + minSpend) : "無"}</div>
        </td>
        <td style="width:120px;text-align:right;">
          <button class="btn2 secondary" type="button" data-edit="${code}">編輯</button>
        </td>
      </tr>
    `;
  }

  function openModal(mode, item) {
    modal.classList.add("open");
    if (mode === "add") {
      editingCode = null;
      modalTitle.textContent = "新增優惠碼";
      btnDelete.style.display = "none";
      modalHint.textContent = "新增時 code 不可重複。";
      cCode.disabled = false;
      cCode.value = "";
      cEnabled.value = "true";
      cType.value = "rate";
      cRate.value = 0.9;
      cAmount.value = 0;
      cMinSpend.value = 0;
      cStartAt.value = "";
      cEndAt.value = "";
      cOnce.value = "false";
      cMaxUses.value = 0;
      cNote.value = "";
    } else {
      editingCode = String(item.code || "").toUpperCase();
      modalTitle.textContent = `編輯優惠碼：${editingCode}`;
      btnDelete.style.display = "inline-flex";
      modalHint.textContent = "編輯時不建議改 code。";
      cCode.disabled = true;
      cCode.value = editingCode;
      cEnabled.value = String(item.enabled);
      cType.value = String(item.type || "rate");
      cRate.value = Number(item.rate ?? 0);
      cAmount.value = Number(item.amount ?? 0);
      cMinSpend.value = Number(item.minSpend ?? 0);
      cStartAt.value = toLocalFromAny(item.startAt);
      cEndAt.value = toLocalFrom
            cEndAt.value = toLocalFromAny(item.endAt);
      cOnce.value = String(item.oncePerMember);
      cMaxUses.value = Number(item.maxUses ?? 0);
      cNote.value = String(item.note || "");
    }
  }

  function buildCouponPayload() {
    const code = String(cCode.value || "").trim().toUpperCase();
    return {
      code,
      enabled: (cEnabled.value === "true"),
      type: String(cType.value || "rate"),
      rate: Number(cRate.value || 0),
      amount: Number(cAmount.value || 0),
      minSpend: Number(cMinSpend.value || 0),
      startAt: toISOFromLocal(cStartAt.value),
      endAt: toISOFromLocal(cEndAt.value),
      oncePerMember: (cOnce.value === "true"),
      maxUses: Number(cMaxUses.value || 0),
      note: String(cNote.value || "")
    };
  }

  async function saveCoupon() {
    toast(toastCoupons, "");
    try {
      const payload = buildCouponPayload();
      if (!payload.code) {
        toast(toastCoupons, "請填 code", false);
        return;
      }
      if (payload.type === "rate" && !(payload.rate > 0 && payload.rate < 1)) {
        toast(toastCoupons, "rate 必須是 0~1 之間（例如 0.9）", false);
        return;
      }
      if (payload.type === "amount" && !(payload.amount > 0)) {
        toast(toastCoupons, "amount 必須 > 0", false);
        return;
      }

      if (editingCode === null) {
        await gasPost("coupons", "POST", payload);
        closeModal();
        await loadCoupons();
        toast(toastCoupons, "新增成功 ✅");
      } else {
        await gasPost("coupons", "PUT", payload, editingCode);
        closeModal();
        await loadCoupons();
        toast(toastCoupons, "儲存成功 ✅");
      }
    } catch (e) {
      console.error(e);
      toast(toastCoupons, "儲存失敗（請檢查 ADMIN_KEY / GAS 寫入）", false);
    }
  }

  async function deleteCoupon() {
    if (!editingCode) return;
    const ok = confirm(`確定刪除優惠碼 ${editingCode} 嗎？`);
    if (!ok) return;

    try {
      await gasPost("coupons", "DELETE", {}, editingCode);
      closeModal();
      await loadCoupons();
      toast(toastCoupons, "刪除成功 ✅");
    } catch (e) {
      console.error(e);
      toast(toastCoupons, "刪除失敗（請檢查 ADMIN_KEY / GAS 寫入）", false);
    }
  }

  // 日期轉換工具
  function toISOFromLocal(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return d.toISOString();
  }

  function toLocalFromAny(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ---------------- End ----------------
});
