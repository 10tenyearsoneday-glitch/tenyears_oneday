const MEMBER_API = "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";
const TOKEN_KEY = "ten_member_token";

async function api(action, payload = {}) {
  const res = await fetch(MEMBER_API, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

window.TEN_MEMBER = {
  register: (d) => api("register", d),
  login: (p, pw) => api("login", { phone:p, password:pw }),
  me: () => {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? api("me", { token:t }) : null;
  },
  update: (d) => api("update", { token:localStorage.getItem(TOKEN_KEY), ...d }),
  logout: () => {
    const t = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return t ? api("logout", { token:t }) : null;
  }
};
