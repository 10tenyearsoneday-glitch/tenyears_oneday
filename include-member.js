const MEMBER_API = "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";

const TOKEN_KEY = "ten_member_token";
const MID_KEY   = "ten_member_id";

async function api(action, payload = {}) {
  const res = await fetch(MEMBER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

window.TEN_MEMBER = {
  async register(data) {
    const res = await api("register", data);
    if (!res.ok) throw res;
    localStorage.setItem(TOKEN_KEY, res.token);
    if (res.memberId) localStorage.setItem(MID_KEY, res.memberId);
    return res;
  },

  async login(phone, password) {
    const res = await api("login", { phone, password });
    if (!res.ok) throw res;
    localStorage.setItem(TOKEN_KEY, res.token);
    if (res.memberId) localStorage.setItem(MID_KEY, res.memberId);
    return res;
  },

  async me() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const res = await api("me", { token });
    return res.ok ? res.profile : null;
  },

  async update(data) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { ok:false };
    return api("update", { token, ...data });
  },

  async orders() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { ok:false };
    return api("orders", { token });
  },

  async logout() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) await api("logout", { token }).catch(()=>{});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MID_KEY);
  }
};
