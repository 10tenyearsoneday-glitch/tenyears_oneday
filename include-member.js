// include-member.js — FINAL STABLE
(() => {
  if (window.TEN_MEMBER) return;

  const GAS =
    "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec"; // 換你的

  const KEY_TOKEN = "ten_member_token";
  const KEY_MEMBER = "ten_member_id";

  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = "cb_" + Math.random().toString(36).slice(2);
      const s = document.createElement("script");
      s.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;

      window[cb] = (res) => {
        delete window[cb];
        s.remove();
        resolve(res);
      };

      s.onerror = () => {
        delete window[cb];
        s.remove();
        reject(new Error("JSONP_FAILED"));
      };

      document.body.appendChild(s);
    });
  }

  function saveAuth(res) {
    localStorage.setItem(KEY_TOKEN, res.token);
    localStorage.setItem(KEY_MEMBER, res.memberId);
  }

  function clearAuth() {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_MEMBER);
  }

  function call(path, params = {}) {
    return jsonp(
      GAS + "?" + new URLSearchParams({ path, ...params }).toString()
    );
  }

  window.TEN_MEMBER = {
    get token() {
      return localStorage.getItem(KEY_TOKEN);
    },
    get memberId() {
      return localStorage.getItem(KEY_MEMBER);
    },

    async register(data) {
      const res = await call("register", data);
      if (res.ok) saveAuth(res);
      return res;
    },

    async login(phone, password) {
      const res = await call("login", { phone, password });
      if (res.ok) saveAuth(res);
      return res;
    },

    async me() {
      if (!this.token) return { ok:false };
      return call("me", { token: this.token });
    },

    async update(data) {
      return call("update", { token: this.token, ...data });
    },

    logout() {
      clearAuth();
      location.href = "member.html";
    }
  };
})();
