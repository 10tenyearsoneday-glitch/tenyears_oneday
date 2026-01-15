const MEMBER_API = "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec";
const TOKEN_KEY = "ten_member_token";

async function api(payload) {
  const body = new URLSearchParams(payload).toString();

  const res = await fetch(MEMBER_API, {
    method: "POST",
    body // ❗不設 headers，避免 preflight
  });

  return res.json();
}

window.TEN_MEMBER = {
  register(data) {
    return api({ action:"register", ...data });
  },
  login(phone, password) {
    return api({ action:"login", phone, password });
  },
  me() {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? api({ action:"me", token:t }) : null;
  },
  update(data) {
    const t = localStorage.getItem(TOKEN_KEY);
    return api({ action:"update", token:t, ...data });
  },
  logout() {
    const t = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return t ? api({ action:"logout", token:t }) : null;
  }
};
