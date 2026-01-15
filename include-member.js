const MEMBER_API =
  "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec";

const TOKEN_KEY = "ten_member_token";

function jsonp(params) {
  return new Promise((resolve, reject) => {
    const cb = "__cb_" + Math.random().toString(36).slice(2);
    const qs = new URLSearchParams({ ...params, callback: cb }).toString();
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

    s.src = MEMBER_API + "?" + qs;
    document.body.appendChild(s);
  });
}


window.TEN_MEMBER = {
  register(data) {
    return jsonp({
      action: "register",
      phone: data.phone,
      password: data.password,
      name: data.name,
      birth_y: data.birth_y,
      birth_m: data.birth_m,
      birth_d: data.birth_d,
      address: data.address
    });
  },

  login(phone, password) {
    return jsonp({
      action: "login",
      phone,
      password
    });
  },

  me() {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? jsonp({ action:"me", token:t }) : null;
  },

  update(data) {
    const t = localStorage.getItem(TOKEN_KEY);
    return jsonp({
      action:"update",
      token: t,
      name: data.name,
      address: data.address
    });
  },

  logout() {
    const t = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return t ? jsonp({ action:"logout", token:t }) : null;
  }
};
