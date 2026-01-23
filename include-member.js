(() => {
  const $ = id => document.getElementById(id);
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec";

  function normalizePhone(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function toast(el, msg, ok = false) {
    el.textContent = msg;
    el.style.color = ok ? "#2f3a2c" : "#8a3b3b";
  }

  /* Tabs */
  const show = mode => {
    $("panelLogin").hidden = mode !== "login";
    $("panelRegister").hidden = mode !== "register";
    $("tabLogin").classList.toggle("active", mode === "login");
    $("tabRegister").classList.toggle("active", mode === "register");
  };
  $("tabLogin")?.addEventListener("click", () => show("login"));
  $("tabRegister")?.addEventListener("click", () => show("register"));

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
    const phone = normalizePhone($("regPhone").value);
    const pw = $("regPw").value;
    const pw2 = $("regPw2").value;
    const name = $("regName").value;

    if (!phone.startsWith("09"))
      return toast($("regToast"), "手機需 09 開頭");
    if (!pw || pw.length < 6)
      return toast($("regToast"), "密碼至少 6 碼");
    if (pw !== pw2)
      return toast($("regToast"), "密碼不一致");
    if (!name)
      return toast($("regToast"), "請填姓名");

    toast($("regToast"), "註冊中…", true);

    const s = document.createElement("script");
    s.src =
      GAS_URL +
      "?action=register" +
      "&phone=" + encodeURIComponent(phone) +
      "&pw=" + encodeURIComponent(pw) +
      "&name=" + encodeURIComponent(name) +
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
      setTimeout(() => location.href = "member-profile.html", 600);
    } else {
      toast($("loginToast"), res.message || "登入失敗");
    }
  };

  $("btnLogin")?.addEventListener("click", () => {
    const phone = normalizePhone($("loginPhone").value);
    const pw = $("loginPw").value;

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
})();
