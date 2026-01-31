  const GAS_URL = "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec"; // ←換成你的
/* =========================
   GLOBAL MEMBER BOOT
========================= */

(function(){

  const token = localStorage.getItem("ten_token");
  if(!token) return;

  window.__bootMemberCb = r => {
    if(!r.ok){
      localStorage.removeItem("ten_token");
      return;
    }

    // 全站會員快取
    window.TEN_MEMBER = r.profile;

    // header 立即切換
    const btn = document.querySelector('[data-icon="member"]');
    if(btn){
      btn.href = "member-profile.html";
      btn.title = "會員中心";
    }

    // 存生日（月日）
    if(r.profile.birth){
      const [y,m,d] = r.profile.birth.split("-");
      localStorage.setItem("ten_birth_m",m);
      localStorage.setItem("ten_birth_d",d);
    }

    document.body.classList.add("is-login");
  };

  const s = document.createElement("script");
  s.src =
    GAS_URL +
    "?action=me" +
    "&token=" + encodeURIComponent(token) +
    "&callback=__bootMemberCb";

  document.body.appendChild(s);

})();


(() => {
  /* =========================
     基本工具
  ========================= */
  const $ = id => document.getElementById(id);


 function normalizePhone(v) {
  v = String(v || "").trim();
  v = v.replace(/[\s\-]/g, "");

  // +8869xxxxxxxx → 09xxxxxxxx
  if (v.startsWith("+886")) {
    v = "0" + v.slice(4);
  }

  // 9xxxxxxxx → 09xxxxxxxx
  if (/^9\d{8}$/.test(v)) {
    v = "0" + v;
  }

  if (!/^09\d{8}$/.test(v)) return "";
  return v; // ⚠️ 一定保留 0
}


  function toast(el, msg, ok = false) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "#2f3a2c" : "#8a3b3b";
  }

  /* =========================
     Tabs
  ========================= */
  function show(mode) {
    $("panelLogin") && ($("panelLogin").hidden = mode !== "login");
    $("panelRegister") && ($("panelRegister").hidden = mode !== "register");
    $("tabLogin")?.classList.toggle("active", mode === "login");
    $("tabRegister")?.classList.toggle("active", mode === "register");
  }

  $("tabLogin")?.addEventListener("click", () => show("login"));
  $("tabRegister")?.addEventListener("click", () => show("register"));

  /* =========================
     Birthday Select Init
  ========================= */
  function initBirthSelect() {
    const y = $("birthY");
    const m = $("birthM");
    const d = $("birthD");
    if (!y || !m || !d) return;

    const nowY = new Date().getFullYear();

    // 年
    y.innerHTML = `<option value="">年</option>`;
    for (let i = nowY; i >= 1900; i--) {
      y.innerHTML += `<option value="${i}">${i}</option>`;
    }

    // 月
    m.innerHTML = `<option value="">月</option>`;
    for (let i = 1; i <= 12; i++) {
      m.innerHTML += `<option value="${i}">${i}</option>`;
    }

    // 日
    d.innerHTML = `<option value="">日</option>`;

    function updateDays() {
      const yy = parseInt(y.value, 10);
      const mm = parseInt(m.value, 10);
      d.innerHTML = `<option value="">日</option>`;
      if (!yy || !mm) return;

      const days = new Date(yy, mm, 0).getDate();
      for (let i = 1; i <= days; i++) {
        d.innerHTML += `<option value="${i}">${i}</option>`;
      }
    }

    y.addEventListener("change", updateDays);
    m.addEventListener("change", updateDays);
  }

  /* =========================
     Register
  ========================= */
window.__registerCb = res => {
  if (res.ok && res.token) {
    localStorage.setItem("ten_token", res.token);
   const p = new URLSearchParams(location.search);
location.href = p.get("redirect") || "member-profile.html";

    return;
  }
  toast($("regToast"), res.message || "註冊失敗");
};


  $("btnRegister")?.addEventListener("click", () => {
    // 🔥 移除舊的 JSONP script，避免 callback 重複
document.querySelectorAll("script[data-jsonp='register']")
  .forEach(s => s.remove());

    const phone = normalizePhone($("regPhone")?.value);
    const pw = $("regPw")?.value || "";
    const pw2 = $("regPw2")?.value || "";
    const name = $("regName")?.value || "";

    if (!phone.startsWith("09"))
      return toast($("regToast"), "手機需 09 開頭");
    if (pw.length < 6)
      return toast($("regToast"), "密碼至少 6 碼");
    if (pw !== pw2)
      return toast($("regToast"), "密碼不一致");
    if (!name)
      return toast($("regToast"), "請填姓名");

    // 生日組合（可選）
    let birth = "";
    const by = $("birthY")?.value;
    const bm = $("birthM")?.value;
    const bd = $("birthD")?.value;
    if (by && bm && bd) {
      birth = `${by}-${String(bm).padStart(2, "0")}-${String(bd).padStart(2, "0")}`;
    }

    const email = $("regEmail")?.value || "";
    const address = $("regAddress")?.value || "";

    if(!email) return toast($("regToast"),"請填 Email");
if(!birth) return toast($("regToast"),"請選生日");
if(!address) return toast($("regToast"),"請填地址");

    toast($("regToast"), "註冊中…", true);

    const s = document.createElement("script");
    s.dataset.jsonp = "register";
    s.src =
      GAS_URL +
      "?action=register" +
      "&phone=" + encodeURIComponent(phone) +
      "&pw=" + encodeURIComponent(pw) +
      "&name=" + encodeURIComponent(name) +
      "&email=" + encodeURIComponent(email) +
      "&address=" + encodeURIComponent(address) +
      (birth ? "&birth=" + encodeURIComponent(birth) : "") +
      "&callback=__registerCb";

    s.onerror = () => toast($("regToast"), "連線失敗");
    document.body.appendChild(s);
  });

  /* =========================
     Login
  ========================= */
  window.__loginCb = res => {
    if (res.ok) {
      localStorage.setItem("ten_token", res.token);
      toast($("loginToast"), "登入成功", true);
   setTimeout(() => {
  const p = new URLSearchParams(location.search);
  location.href = p.get("redirect") || "member-profile.html";
}, 600);

    } else {
      toast($("loginToast"), res.message || "登入失敗");
    }
  };

  $("btnLogin")?.addEventListener("click", () => {
    const phone = normalizePhone($("loginPhone")?.value);
    const pw = $("loginPw")?.value || "";

    if (!phone || !pw)
      return toast($("loginToast"), "請輸入帳密");

    toast($("loginToast"), "登入中…", true);

    const s = document.createElement("script");
    s.src =
      GAS_URL +
      "?action=login" +
      "&phone=" + encodeURIComponent(phone) +
      "&pw=" + encodeURIComponent(pw) +
      "&callback=__loginCb";

    s.onerror = () => toast($("loginToast"), "連線失敗");
    document.body.appendChild(s);
  });

  /* =========================
     Init
  ========================= */
  initBirthSelect();
})();
/* =========================
   Profile Page (FINAL FIX)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("ten_token");
  if (!token) return;

  // 讀取會員資料
window.__meCb = res => {
  if (!res.ok) return;
  const p = res.profile || {};
  document.getElementById("pfName").value = p.name || "";
  document.getElementById("pfPhone").value = p.phone || "";
  document.getElementById("pfEmail").value = p.email || "";
  document.getElementById("pfBirth").value = p.birth || "";
  document.getElementById("pfAddress").value = p.address || "";

  // 🔒 已填生日就鎖住
  if (p.birth) {
    document.getElementById("pfBirth").disabled = true;
  }
};


  const s = document.createElement("script");
  s.src =
    GAS_URL +
    "?action=me" +
    "&token=" + encodeURIComponent(token) +
    "&callback=__meCb";
  document.body.appendChild(s);

  // 儲存
  document.getElementById("btnSaveProfile")
    .addEventListener("click", () => {
      document.getElementById("profileToast").textContent = "儲存中…";

      window.__profileSaveCb = r => {
        document.getElementById("profileToast").textContent =
          r.ok ? "已儲存" : "儲存失敗";
      };

      const qs =
        "?action=update" +
        "&token=" + encodeURIComponent(token) +
        "&name=" + encodeURIComponent(document.getElementById("pfName").value || "") +
        "&email=" + encodeURIComponent(document.getElementById("pfEmail").value || "") +
        "&address=" + encodeURIComponent(document.getElementById("pfAddress").value || "") +
        "&birth=" + encodeURIComponent(document.getElementById("pfBirth").value || "") +
        "&callback=__profileSaveCb";

      const s2 = document.createElement("script");
      s2.src = GAS_URL + qs;
      document.body.appendChild(s2);
    });

  // 登出
  document.getElementById("btnLogout")
    .addEventListener("click", () => {
      localStorage.removeItem("ten_token");
      location.href = "member.html";
    });
  loadMyOrders();
});
// 讀取我的訂單（FINAL FINAL）
function loadMyOrders() {
  const token = localStorage.getItem("ten_token");
  if (!token) return;

  const list = document.getElementById("orderList");
  if (!list) return;

  window.__myOrdersCb = res => {
    if (!res.ok || !res.orders || !res.orders.length) {
      list.textContent = "尚無訂單";
      return;
    }

    list.innerHTML = res.orders.map((o, idx) => {
      let items = [];
      try {
        items = JSON.parse(o.items_json || "[]");
      } catch (e) {}

      const itemsHtml = items.length
        ? items.map(it => `
            <div style="display:flex;justify-content:space-between">
              <span>・${it.title || it.name} × ${it.qty || 1}</span>
              <span>NT$ ${it.price}</span>
            </div>
          `).join("")
        : `<div>（無商品明細）</div>`;

      return `
        <div style="border-bottom:1px dashed rgba(0,0,0,.2);padding:12px 0">
          <div><b>訂單編號：</b>${o.order_id}</div>
          <div>下單時間：${new Date(o.created_at).toLocaleString()}</div>
          <div>金額：NT$ ${o.total}</div>
          <div>折扣：${o.discount_note || "—"}</div>
          <div>狀態：${o.pay_status}</div>

          <div
            id="toggle-${idx}"
            style="margin-top:8px;cursor:pointer;color:#556b5f;font-size:13px"
            onclick="toggleOrderItems(${idx})"
          >
            ▶ 查看商品明細
          </div>

          <div
            id="order-items-${idx}"
            style="display:none;margin-top:8px;
                   padding:10px;
                   background:rgba(0,0,0,.03);
                   border-radius:10px;
                   font-size:13px"
          >
            ${itemsHtml}
            <div style="margin-top:6px;text-align:right">
              小計：NT$ ${o.subtotal}
            </div>

            <div style="margin-top:14px;border-top:1px dashed rgba(0,0,0,.2);padding-top:10px">
              <div style="font-weight:600;margin-bottom:6px">訂單狀態</div>
              ${renderOrderStatus(o)}
            </div>
          </div>
        </div>
      `;
    }).join("");
  };

  // 🔥 正確位置：在 function 裡
  document
    .querySelectorAll("script[data-jsonp='my_orders']")
    .forEach(s => s.remove());

  const s = document.createElement("script");
  s.dataset.jsonp = "my_orders";
  s.src =
    GAS_URL +
    "?path=my_orders" +
    "&token=" + encodeURIComponent(token) +
    "&callback=__myOrdersCb";
  document.body.appendChild(s);
}

function toggleOrderItems(idx) {
  const el = document.getElementById("order-items-" + idx);
  const btn = document.getElementById("toggle-" + idx);
  if (!el || !btn) return;

  const open = el.style.display === "none";
  el.style.display = open ? "block" : "none";
  btn.textContent = open ? "▼ 收合商品明細" : "▶ 查看商品明細";
}
function renderOrderStatus(o) {
  const steps = [
    {
      label: "已下單",
      done: true,
      time: o.created_at
    },
    {
      label: "已付款",
      done: o.pay_status === "PAID",
      time: o.paid_at
    },
    {
      label: "已出貨",
      done: !!o.shipped_at,
      time: o.shipped_at
    }
  ];

  return steps.map(s => `
    <div style="display:flex;align-items:center;margin:6px 0">
      <span style="
        display:inline-block;
        width:10px;height:10px;
        border-radius:50%;
        margin-right:8px;
        background:${s.done ? "#556b5f" : "#ccc"};
      "></span>
      <span style="flex:1">${s.label}</span>
      <span style="color:#777;font-size:12px">
        ${s.done && s.time ? new Date(s.time).toLocaleString() : "—"}
      </span>
    </div>
  `).join("");
}
(function showMemberStatus(){

  const token = localStorage.getItem("ten_token");

  const memberBtn = document.querySelector('[data-icon="member"]');

  if(!memberBtn) return;

  if(token){
    memberBtn.title = "會員中心";
    memberBtn.href = "member-profile.html";
  }else{
    memberBtn.title = "登入 / 註冊";
    memberBtn.href = "member.html";
  }

})();
