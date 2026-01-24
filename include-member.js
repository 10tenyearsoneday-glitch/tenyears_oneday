(() => {
  /* =========================
     基本工具
  ========================= */
  const $ = id => document.getElementById(id);
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec"; // ←換成你的

  function normalizePhone(v) {
    return String(v || "").replace(/\D/g, "");
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
    if (res.ok) {
      toast($("regToast"), "註冊成功，請登入", true);
      show("login");
    } else {
      toast($("regToast"), res.message || "註冊失敗");
    }
  };

  $("btnRegister")?.addEventListener("click", () => {
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
