  const GAS_URL = "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec"; // ←換成你的

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
    location.href = "member-profile.html";
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
        location.href = "member-profile.html";
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
});
// 讀取我的訂單
function loadMyOrders() {
  const token = localStorage.getItem("ten_token");
  if (!token) return;

  window.__myOrdersCb = res => {
    if (!res.ok || !res.orders?.length) {
      document.getElementById("orderList").textContent = "尚無訂單";
      return;
    }

    document.getElementById("orderList").innerHTML = res.orders.map(o => `
      <div style="border-bottom:1px dashed rgba(0,0,0,.2);padding:10px 0">
        <div>訂單編號：${o.order_id}</div>
        <div>下單時間：${new Date(o.created_at).toLocaleString()}</div>
        <div>金額：NT$ ${o.total}</div>
        <div>折扣：${o.discount_note || "—"}</div>
        <div>狀態：${o.pay_status}</div>
      </div>
    `).join("");
  };

  const s = document.createElement("script");
  s.src =
    GAS_URL +
    "?path=my_orders" +
    "&token=" + encodeURIComponent(token) +
    "&callback=__myOrdersCb";
  document.body.appendChild(s);
}

// 在 DOMContentLoaded 裡呼叫
loadMyOrders();

