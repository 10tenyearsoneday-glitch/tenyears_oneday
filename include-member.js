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
    return jsonp({ action:"register", ...data });
  },
  login(phone, password) {
    return jsonp({ action:"login", phone, password });
  },
  me() {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? jsonp({ action:"me", token:t }) : null;
  },
  update(data) {
    const t = localStorage.getItem(TOKEN_KEY);
    return jsonp({ action:"update", token:t, ...data });
  },
  logout() {
    const t = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return t ? jsonp({ action:"logout", token:t }) : null;
  }
};
