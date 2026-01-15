// include-member.js — TEN YEARS ONE DAY (FINAL)

(() => {
  const API =
    "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";

  const KEY = "ten_member_token";

  async function call(path, data = {}) {
    const token = localStorage.getItem(KEY);
    const params = new URLSearchParams({ path, ...data });
    if (token) params.append("token", token);

    const res = await fetch(`${API}?${params.toString()}`);
    return await res.json();
  }

  window.TEN_MEMBER = {
    async register(data) {
      const out = await call("register", data);
      if (out.ok && out.token) localStorage.setItem(KEY, out.token);
      return out;
    },
    async login(data) {
      const out = await call("login", data);
      if (out.ok && out.token) localStorage.setItem(KEY, out.token);
      return out;
    },
    async me() {
      return await call("me");
    },
    async logout() {
      const out = await call("logout");
      localStorage.removeItem(KEY);
      return out;
    }
  };
})();
