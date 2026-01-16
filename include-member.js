const MEMBER_API =
  "https://script.google.com/macros/s/AKfycbwf5bVyoiFTtN6SIPmdyTtlFk9Ja9zejWc_yZTVP8PNkpmyx1XVpTSiVwa4tUUBIqI-tg/exec";

const TOKEN_KEY = "ten_member_token";

function jsonp(params) {
  return new Promise(function(resolve, reject) {
    var cb = "__cb_" + Math.random().toString(36).slice(2);
    var qs = "";

    for (var k in params) {
      qs += encodeURIComponent(k) + "=" + encodeURIComponent(params[k] || "") + "&";
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
  register: function(d) {
    return jsonp({
      action:"register",
      phone:d.phone,
      password:d.r_pw,
      name:d.name,
      birth_y:d.birth_y,
      birth_m:d.birth_m,
      birth_d:d.birth_d,
      address:d.address
    });
  },

  login: function(phone,pw) {
    return jsonp({
      action:"login",
      phone:phone,
      password:pw
    });
  },

  me: function() {
    var t = localStorage.getItem(TOKEN_KEY);
    if (!t) return Promise.resolve({ ok:false });
    return jsonp({ action:"me", token:t });
  },

  update: function(d) {
    var t = localStorage.getItem(TOKEN_KEY);
    if (!t) return Promise.resolve({ ok:false });
    return jsonp({
      action:"update",
      token:t,
      name:d.name,
      address:d.address
    });
  },

  logout: function() {
    var t = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return jsonp({ action:"logout", token:t });
  }
};
