const MEMBER_API =
  "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec";

const TOKEN_KEY = "ten_member_token";

function jsonp(params) {
  return new Promise(function(resolve, reject) {
    var cb = "__cb_" + Math.random().toString(36).slice(2);
    var qs = "";

    for (var k in params) {
      if (params.hasOwnProperty(k)) {
        qs += encodeURIComponent(k) + "=" + encodeURIComponent(params[k] || "") + "&";
      }
    }
    qs += "callback=" + cb;

    var s = document.createElement("script");

    window[cb] = function(data) {
      delete window[cb];
      s.remove();
      resolve(data);
    };

    s.onerror = function() {
      delete window[cb];
      s.remove();
      reject(new Error("JSONP_FAILED"));
    };

    s.src = MEMBER_API + "?" + qs;
    document.body.appendChild(s);
  });
}

window.TEN_MEMBER = {
  register: function(data) {
    return jsonp({
      action: "register",
      phone: data.phone,
      password: data.password,   // 🔴 一定要有
      name: data.name,
      birth_y: data.birth_y,     // 🔴 一定要有
      birth_m: data.birth_m,
      birth_d: data.birth_d,
      address: data.address
    });
  },

  login: function(phone, password) {
    return jsonp({
      action: "login",
      phone: phone,
      password: password
    });
  },

  me: function() {
    var t = localStorage.getItem(TOKEN_KEY);
    if (!t) return null;
    return jsonp({ action: "me", token: t });
  },

  logout: function() {
    var t = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    if (!t) return null;
    return jsonp({ action: "logout", token: t });
  }
};
