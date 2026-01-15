/* =========================
   TEN MEMBER - JSONP CORE (FIXED)
========================= */

const MEMBER_API =
  "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = "__cb_" + Math.random().toString(36).slice(2);
    const s = document.createElement("script");

    window[cb] = (data) => {
      delete window[cb];
      s.remove();
      resolve(data);
    };

    s.onerror = () => {
      delete window[cb];
      s.remove();
      reject(new Error("JSONP_FAILED"));
    };

    s.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
    document.body.appendChild(s);
  });
}

function call(action, params = {}) {
  const q = new URLSearchParams({ action, ...params }).toString();
  return jsonp(`${MEMBER_API}?${q}`);
}

window.TEN_MEMBER = {
  async register(data) {
    const res = await call("register", {
      phone: data.phone,
      password: data.password,
      name: data.name, // ✅ 不再 encode
      birth: data.birth || "",
      email: data.email || "",
      address: data.address || ""
    });
    if (!res.ok) throw res;
    localStorage.setItem("ten_token", res.token);
    location.href = "member-profile.html";
  },

  async login(phone, password) {
    const res = await call("login", { phone, password });
    if (!res.ok) throw res;
    localStorage.setItem("ten_token", res.token);
    location.href = "member-profile.html";
  },

  async me() {
    const token = localStorage.getItem("ten_token");
    if (!token) return null;
    const res = await call("me", { token });
    return res.ok ? res.profile : null;
  },

  async update(data) {
    const token = localStorage.getItem("ten_token");
    if (!token) return { ok: false };
    return call("update", { token, ...data });
  },

  logout() {
    localStorage.removeItem("ten_token");
    location.href = "member.html";
  }
};
