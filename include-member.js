const MEMBER_API =
  "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";

async function post(action, payload = {}) {
  const res = await fetch(MEMBER_API, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

window.TEN_MEMBER = {
  async register(data) {
    const res = await post("register", data);
    if (!res.ok) throw res;
    localStorage.setItem("ten_token", res.token);
    location.href = "member-profile.html";
  },

  async login(phone, password) {
    const res = await post("login", { phone, password });
    if (!res.ok) throw res;
    localStorage.setItem("ten_token", res.token);
    location.href = "member-profile.html";
  },

  async me() {
    const token = localStorage.getItem("ten_token");
    if (!token) return null;
    const res = await post("me", { token });
    return res.ok ? res.profile : null;
  },

  async update(data) {
    const token = localStorage.getItem("ten_token");
    return post("update", { token, ...data });
  },

  logout() {
    localStorage.removeItem("ten_token");
    location.href = "member.html";
  }
};
