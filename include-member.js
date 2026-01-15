const MEMBER_API = "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec";
const TOKEN_KEY = "ten_member_token";

async function api(action, payload = {}) {
  const res = await fetch(MEMBER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

window.TEN_MEMBER = {
  register(data) {
    return api("register", data);
  },
  login(phone, password) {
    return api("login", { phone, password });
  },
  me() {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? api("me", { token: t }) : null;
  },
  update(data) {
    const t = localStorage.getItem(TOKEN_KEY);
    return api("update", { token: t, ...data });
  },
  logout() {
    const t = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return t ? api("logout", { token: t }) : null;
  }
};
