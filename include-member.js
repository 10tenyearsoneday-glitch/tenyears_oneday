/* include-member.js (FINAL)
 * Member-only JS for TEN YEARS ONE DAY
 * - Uses JSONP to avoid CORS on GitHub Pages
 * - Works with members GAS:
 *   https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec
 *
 * Pages supported:
 * - member.html (login/register)
 * - member-profile.html (profile)
 */
(() => {
  if (window.TEN_MEMBER_LOADED) return;
  window.TEN_MEMBER_LOADED = true;

  const MEMBER_KEY = "ten_member_id";
  const TOKEN_KEY  = "ten_member_token";

  window.TEN_CONFIG = window.TEN_CONFIG || {};
  const GAS_URL = window.TEN_CONFIG.members_gas_url || "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec";

  function $(id) { return document.getElementById(id); }

  function genId() {
    return "M-" + Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  function getMemberId() {
    let id = localStorage.getItem(MEMBER_KEY);
    if (!id) {
      id = genId();
      localStorage.setItem(MEMBER_KEY, id);
    }
    return id;
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }
  function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }

  function jsonp(params={}) {
    return new Promise((resolve, reject) => {
      const cb = "cb_" + Math.random().toString(36).slice(2);
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("JSONP_TIMEOUT"));
      }, 12000);

      function cleanup() {
        clearTimeout(timeout);
        try { delete window[cb]; } catch {}
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }

      window[cb] = (data) => {
        cleanup();
        resolve(data);
      };

      const qs = new URLSearchParams({ ...params, callback: cb }).toString();
      const url = GAS_URL + "?" + qs;

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP_LOAD_FAIL"));
      };
      document.head.appendChild(script);
    });
  }

  // ===== API =====
  async function register(payload) {
    const data = await jsonp({
      path: "register",
      memberId: payload.memberId || getMemberId(),
      phone: payload.phone || "",
      pw: payload.pw || "",
      name: payload.name || "",
      email: payload.email || "",
      birth: payload.birth || "",   // YYYY-MM-DD
      address: payload.address || ""
    });
    return data;
  }

  async function login(phone, pw) {
    const data = await jsonp({
      path: "login",
      phone: phone || "",
      pw: pw || ""
    });
    if (data && data.ok && data.token) {
      setToken(data.token);
      if (data.memberId) localStorage.setItem(MEMBER_KEY, data.memberId);
    }
    return data;
  }

  async function me() {
    const token = getToken();
    const data = await jsonp({
      action: "member_get",
      token
    });
    return data;
  }

  async function updateProfile(payload) {
    const token = getToken();
    const data = await jsonp({
      action: "member_update",
      token,
      name: payload.name || "",
      email: payload.email || "",
      birth: payload.birth || "",
      address: payload.address || ""
    });
    return data;
  }

  function logout() {
    setToken("");
    // memberId 留著（方便首購/生日折扣），但你也可以清掉
    // localStorage.removeItem(MEMBER_KEY);
  }

  // Expose
  window.TEN_MEMBER = {
    GAS_URL,
    getMemberId,
    getToken,
    setToken,
    register,
    login,
    me,
    updateProfile,
    logout
  };

  // ===== UI helpers =====
  function toast(el, msg, ok=true) {
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
  }

  function ymdFromSelect(y, m, d) {
    const yy = String(y||"").trim();
    const mm = String(m||"").trim();
    const dd = String(d||"").trim();
    if (!yy || !mm || !dd) return "";
    const m2 = mm.padStart(2,"0");
    const d2 = dd.padStart(2,"0");
    return `${yy}-${m2}-${d2}`;
  }

  function initBirthSelects() {
    const ySel = $("birthY");
    const mSel = $("birthM");
    const dSel = $("birthD");
    if (!ySel || !mSel || !dSel) return;

    // 避免重複灌
    if (ySel.dataset.ready === "1") return;
    ySel.dataset.ready = "1";

    const now = new Date();
    const thisY = now.getFullYear();
    // 年：thisY-80 ~ thisY-10（可自行調）
    const yStart = thisY - 80;
    const yEnd   = thisY - 10;

    ySel.innerHTML = `<option value="">年</option>` + Array.from({length: yEnd - yStart + 1}, (_,i)=>yStart+i)
      .reverse()
      .map(y=>`<option value="${y}">${y}</option>`).join("");

    mSel.innerHTML = `<option value="">月</option>` + Array.from({length:12},(_,i)=>i+1)
      .map(m=>`<option value="${m}">${m}</option>`).join("");

    const fillDays = () => {
      const y = Number(ySel.value || 2000);
      const m = Number(mSel.value || 1);
      const days = new Date(y, m, 0).getDate();
      const cur = dSel.value;
      dSel.innerHTML = `<option value="">日</option>` + Array.from({length:days},(_,i)=>i+1)
        .map(d=>`<option value="${d}">${d}</option>`).join("");
      if (cur) dSel.value = cur;
    };
    fillDays();
    ySel.addEventListener("change", fillDays);
    mSel.addEventListener("change", fillDays);
  }

  function initMemberPage() {
    // member.html 的元素存在才初始化
    const tabLogin = $("tabLogin");
    const tabRegister = $("tabRegister");
    const panelLogin = $("panelLogin");
    const panelRegister = $("panelRegister");
    const btnLogin = $("btnLogin");
    const btnRegister = $("btnRegister");
    if (!tabLogin || !tabRegister || !panelLogin || !panelRegister || !btnLogin || !btnRegister) return;

    initBirthSelects();

    const loginToastEl = $("loginToast");
    const regToastEl   = $("regToast");

    // Tabs
    function show(which) {
      const isLogin = which === "login";
      panelLogin.hidden = !isLogin;
      panelRegister.hidden = isLogin;
      tabLogin.classList.toggle("active", isLogin);
      tabRegister.classList.toggle("active", !isLogin);
      toast(loginToastEl, "");
      toast(regToastEl, "");
    }
    tabLogin.addEventListener("click", () => show("login"));
    tabRegister.addEventListener("click", () => show("register"));

    // Default
    show("login");

    // Register
    btnRegister.addEventListener("click", async (e) => {
      e.preventDefault();
      toast(regToastEl, "送出中…");

      const name = String($("regName")?.value || "").trim();
      let phone = String($("regPhone")?.value || "").trim();
      phone = normalizePhone(phone);
      const email = String($("regEmail")?.value || "").trim();
      const pw = String($("regPw")?.value || "").trim();
      const pw2 = String($("regPw2")?.value || "").trim();
      const address = String($("regAddress")?.value || "").trim();

      const birth = ymdFromSelect($("birthY")?.value, $("birthM")?.value, $("birthD")?.value);

      if (!name) return toast(regToastEl, "請輸入姓名", false);
      if (!phone) return toast(regToastEl, "請輸入手機", false);
      if (pw.length < 6) return toast(regToastEl, "密碼至少 6 碼", false);
      if (pw !== pw2) return toast(regToastEl, "兩次密碼不一致", false);

      try {
        const out = await register({ memberId: getMemberId(), name, phone, email, pw, birth, address });
        if (!out || out.ok !== true) {
          return toast(regToastEl, out?.message || `註冊失敗：${out?.error || "ERROR"}`, false);
        }
        toast(regToastEl, "✅ 註冊成功，已可登入");
        // 註冊成功後切到登入並帶入手機
        $("loginPhone").value = phone;
        show("login");
      } catch (err) {
        console.error(err);
        toast(regToastEl, "系統忙碌或連線失敗，請稍後再試", false);
      }
    });

    // Login
    btnLogin.addEventListener("click", async (e) => {
      e.preventDefault();
      toast(loginToastEl, "登入中…");
      let phone = String($("loginPhone")?.value || "").trim();
      phone = normalizePhone(phone);
      const pw = String($("loginPw")?.value || "").trim();
      if (!phone) return toast(loginToastEl, "請輸入手機", false);
      if (!pw) return toast(loginToastEl, "請輸入密碼", false);

      try {
        const out = await login(phone, pw);
        if (!out || out.ok !== true) {
          return toast(loginToastEl, out?.message || `登入失敗：${out?.error || "ERROR"}`, false);
        }
        toast(loginToastEl, "✅ 登入成功，前往資料頁…");
        setTimeout(() => {
          location.href = "./member-profile.html";
        }, 450);
      } catch (err) {
        console.error(err);
        toast(loginToastEl, "系統忙碌或連線失敗，請稍後再試", false);
      }
    });
  }

  function initProfilePage() {
    const wrap = $("profileWrap");
    const btnSave = $("btnSaveProfile");
    const btnLogout = $("btnLogout");
    if (!wrap || !btnSave || !btnLogout) return;

    const toastEl = $("profileToast");

    const fill = (m) => {
      $("pfName").value = m?.name || "";
      $("pfPhone").value = m?.phone || "";
      $("pfEmail").value = m?.email || "";
      $("pfAddress").value = m?.address || "";
      const by = String(m?.birth_y || "");
      const bm = String(m?.birth_m || "");
      const bd = String(m?.birth_d || "");
      if ($("pfBirth")) {
        const b = (by && bm && bd) ? `${by}-${String(bm).padStart(2,"0")}-${String(bd).padStart(2,"0")}` : "";
        $("pfBirth").value = b;
      }
    };

    async function loadMe() {
      toast(toastEl, "載入中…");
      try {
        const out = await me();
        if (!out || out.ok !== true) {
          toast(toastEl, out?.message || "尚未登入，請先登入", false);
          setTimeout(() => location.href="./member.html", 600);
          return;
        }
        fill(out.member);
        toast(toastEl, "");
      } catch (err) {
        console.error(err);
        toast(toastEl, "載入失敗，請稍後再試", false);
      }
    }

    btnSave.addEventListener("click", async (e) => {
      e.preventDefault();
      toast(toastEl, "儲存中…");

      const name = String($("pfName")?.value || "").trim();
      const email = String($("pfEmail")?.value || "").trim();
      const address = String($("pfAddress")?.value || "").trim();
      const birth = String($("pfBirth")?.value || "").trim(); // YYYY-MM-DD

      if (!name) return toast(toastEl, "姓名不可空白", false);

      try {
        const out = await updateProfile({ name, email, address, birth });
        if (!out || out.ok !== true) {
          return toast(toastEl, out?.message || `儲存失敗：${out?.error || "ERROR"}`, false);
        }
        toast(toastEl, "✅ 已儲存");
      } catch (err) {
        console.error(err);
        toast(toastEl, "儲存失敗，請稍後再試", false);
      }
    });

    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
      location.href = "./member.html";
    });

    loadMe();
  }

  window.addEventListener("DOMContentLoaded", () => {
    initMemberPage();
    initProfilePage();
  });
})();

  function normalizePhone(phone){
    phone = String(phone||"").trim().replace(/[\s-]/g,"");
    phone = phone.replace(/^\+886/,"0");
    if (/^9\d{8}$/.test(phone)) phone = "0"+phone;
    return phone;
  }

