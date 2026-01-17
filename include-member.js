(() => {
  const $ = id => document.getElementById(id);

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
  $("tabLogin").onclick = () => show("login");
  $("tabRegister").onclick = () => show("register");

  /* Register */
  $("btnRegister").onclick = async () => {
    const phone = normalizePhone($("regPhone").value);
    const pw = $("regPw").value;
    const pw2 = $("regPw2").value;
    const name = $("regName").value;

    if (!phone.startsWith("09")) return toast($("regToast"), "手機需 09 開頭");
    if (pw !== pw2) return toast($("regToast"), "密碼不一致");

    toast($("regToast"), "送出中…", true);
    // 呼叫 GAS（略）
  };

  /* Login */
  $("btnLogin").onclick = async () => {
    const phone = normalizePhone($("loginPhone").value);
    const pw = $("loginPw").value;

    if (!phone || !pw) return toast($("loginToast"), "請輸入帳密");
    toast($("loginToast"), "登入中…", true);
    // 呼叫 GAS（略）
  };
})();
