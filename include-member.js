// include-member.js — TEN YEARS ONE DAY (STABLE FINAL)

(() => {
  const API =
    "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";

  const TOKEN_KEY = "ten_member_token";
  const MEMBER_KEY = "ten_member_profile";

  /* =========================
     helpers
  ========================= */
  const saveSession = (out) => {
    if (out.token) localStorage.setItem(TOKEN_KEY, out.token);
    if (out.profile) localStorage.setItem(MEMBER_KEY, JSON.stringify(out.profile));
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MEMBER_KEY);
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const fetchAPI = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API}?${qs}`, { cache: "no-store" });
    return await res.json();
  };

  /* =========================
     core methods
  ========================= */
  async function register(data) {
    const out = await fetchAPI({
      path: "register",
      ...data
    });
    if (out.ok) saveSession(out);
    return out;
  }

  async function login(data) {
    const out = await fetchAPI({
      path: "login",
      ...data
    });
    if (out.ok) saveSession(out);
    return out;
  }

  async function me() {
    const token = getToken();
    if (!token) return { ok: false };

    const out = await fetchAPI({
      path: "me",
      token
    });

    if (!out.ok) {
      clearSession();
    } else {
      saveSession(out);
    }

    return out;
  }

  async function update(data) {
    const token = getToken();
    if (!token) return { ok: false, error: "NOT_LOGIN" };

    const out = await fetchAPI({
      path: "update",
      token,
      ...data
    });

    if (out.ok) saveSession(out);
    return out;
  }

  async function logout() {
    const token = getToken();
    if (token) {
      await fetchAPI({ path: "logout", token });
    }
    clearSession();
    return { ok: true };
  }

  /* =========================
     🔑 PUBLIC API（重點）
  ========================= */
  window.TEN_MEMBER = {
    register,
    login,
    me,
    update,
    logout
  };
})();
