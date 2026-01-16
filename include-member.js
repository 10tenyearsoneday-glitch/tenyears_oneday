/* include-member.js — FINAL / WORKING
 * TEN YEARS ONE DAY 會員系統
 * ✔ JSONP（GitHub Pages 可用）
 * ✔ 對齊 members.GAS.JSONP.v4.final.gs（使用 action）
 */

(() => {
  if (window.TEN_MEMBER_LOADED) return;
  window.TEN_MEMBER_LOADED = true;

  /* =========================
     基本設定
  ========================= */
  const MEMBER_KEY = "ten_member_id";
  const TOKEN_KEY  = "ten_member_token";

  window.TEN_CONFIG = window.TEN_CONFIG || {};
  const GAS_URL =
    window.TEN_CONFIG.members_gas_url ||
    "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec";

  const $ = (id) => document.getElementById(id);

  /* =========================
     工具
  ========================= */
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

  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }
  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function normalizePhone(phone) {
    phone = String(phone || "").trim().replace(/[\s-]/g, "");
    phone = phone.replace(/^\+886/, "0");
    if (/^9\d{8}$/.test(phone)) phone = "0" + phone;
    return phone;
  }

  function toast(el, msg, ok = true) {
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
  }

  /* =========================
     JSONP
  ========================= */
  function jsonp(params = {}) {
    return new Promise((resolve, reject) => {
      const cb = "cb_" + Math.random().toString(36).slice(2);
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("JSONP_TIMEOUT"));
      }, 12000);

      function cleanup() {
        clearTimeout(timer);
        try { delete window[cb]; } catch {}
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cb] = (data) => {
        cleanup();
        resolve(data);
      };

      const qs = new URLSearchParams({ ...params, callback: cb }).toString();
      const script = document.createElement("script");
      script.src = GAS_URL + "?" + qs;
      script.async = true;
      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP_LOAD_FAIL"));
      };
      document.head.appendChild(script);
    });
  }

  /* =========================
     API（對齊 GAS）
  ========================= */
  const API = {
    register: (p) =>
      jsonp({
        action: "register",
        memberId: p.memberId,
        phone: p.phone,
        pw: p.pw,
        name: p.name,
        email: p.email || "",
        birth: p.birth || "",
        address: p.address || ""
      }),

    login: (phone, pw) =>
      jsonp({
        action: "login",
        phone,
        pw
      }).then((out) => {
        if (out?.ok && out.token) {
          setToken(out.token);
          if (out.memberId) localStorage.setItem(MEMBER_KEY, out.memberId);
        }
        return out;
      }),

    me: () =>
      jsonp({
        action: "member_get",
        token: getToken()
      }),

    updateProfile: (p) =>
      jsonp({
        action: "member_update",
        token: getToken(),
        name: p.name,
        email: p.email || "",
        birth: p.birth || "",
        address: p.address || ""
      }),

    logout: () => setToken("")
  };

  window.TEN_MEMBER = API;

  /* =========================
     生日選單
  ========================= */
  function ymdFromSelect(y, m, d) {
    if (!y || !m || !d) return "";
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function initBirthSelects() {
    const y = $("birthY"), m = $("birthM"), d = $("birthD");
    if (!y || !m || !d || y.dataset.ready) return;
    y.dataset.ready = "1";

    const now = new Date().getFullYear();
    y.innerHTML =
      `<option value="">年</option>` +
      Array.from({ length: 71 }, (_, i) => now - 10 - i)
        .map(v => `<option value="${v}">${v}</option>`).join("");

    m.innerHTML =
      `<option value="">月</option>` +
      Array.from({ length: 12 }, (_, i) => i + 1)
        .map(v => `<option value="${v}">${v}</option>`).join("");

    const fillDays = () => {
      const days = new Date(y.value || 2000, m.value || 1, 0).getDate();
      d.innerHTML =
        `<option value="">日</option>` +
        Array.from({ length: days }, (_, i) => i + 1)
          .map(v => `<option value="${v}">${v}</option>`).join("");
    };
    y.addEventListener("change", fillDays);
    m.addEventListener("change", fillDays);
    fillDays();
  }

  /* =========================
     member.html
  ========================= */
  function initMemberPage() {
    const btnLogin = $("btnLogin");
    const btnRegister = $("btnRegister");
    if (!btnLogin || !btnRegister) return;

    initBirthSelects();

    const loginToast = $("loginToast");
    const regToast   = $("regToast");

    btnRegister.onclick = async () => {
      toast(regToast, "送出中…");
      const name = $("regName").value.trim();
      let phone  = normalizePhone($("regPhone").value);
      const pw   = $("regPw").value.trim();
      const pw2  = $("regPw2").value.trim();
      const email = $("regEmail")?.value.trim();
      const address = $("regAddress")?.value.trim();
      const birth = ymdFromSelect(
        $("birthY")?.value,
        $("birthM")?.value,
        $("birthD")?.value
      );

      if (!name) return toast(regToast, "請輸入姓名", false);
      if (!phone) return toast(regToast, "請輸入手機", false);
      if (pw.length < 6) return toast(regToast, "密碼至少 6 碼", false);
      if (pw !== pw2) return toast(regToast, "密碼不一致", false);

      const out = await API.register({
        memberId: getMemberId(),
        name, phone, pw, email, birth, address
      });

      if (!out?.ok) {
        return toast(regToast, out?.message || "註冊失敗", false);
      }

      toast(regToast, "✅ 註冊成功，請登入");
      $("loginPhone").value = phone;
    };

    btnLogin.onclick = async () => {
      toast(loginToast, "登入中…");
      let phone = normalizePhone($("loginPhone").value);
      const pw  = $("loginPw").value.trim();

      if (!phone || !pw) return toast(loginToast, "請輸入帳號密碼", false);

      const out = await API.login(phone, pw);
      if (!out?.ok) {
        return toast(loginToast, out?.message || "登入失敗", false);
      }

      toast(loginToast, "✅ 登入成功");
      setTimeout(() => location.href = "./member-profile.html", 400);
    };
  }

  /* =========================
     member-profile.html
  ========================= */
  function initProfilePage() {
    if (!$("btnSaveProfile")) return;

    const toastEl = $("profileToast");

    API.me().then(out => {
      if (!out?.ok) {
        toast(toastEl, "尚未登入", false);
        return setTimeout(() => location.href = "./member.html", 600);
      }
      const m = out.member;
      $("pfName").value = m.name || "";
      $("pfPhone").value = m.phone || "";
      $("pfEmail").value = m.email || "";
      $("pfAddress").value = m.address || "";
      if (m.birth_y && m.birth_m && m.birth_d) {
        $("pfBirth").value =
          `${m.birth_y}-${String(m.birth_m).padStart(2,"0")}-${String(m.birth_d).padStart(2,"0")}`;
      }
    });

    $("btnSaveProfile").onclick = async () => {
      toast(toastEl, "儲存中…");
      const out = await API.updateProfile({
        name: $("pfName").value.trim(),
        email: $("pfEmail").value.trim(),
        address: $("pfAddress").value.trim(),
        birth: $("pfBirth").value
      });
      toast(toastEl, out?.ok ? "✅ 已儲存" : "儲存失敗", !!out?.ok);
    };

    $("btnLogout").onclick = () => {
      API.logout();
      location.href = "./member.html";
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMemberPage();
    initProfilePage();
  });
})();
