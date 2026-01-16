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

const r = await TEN_MEMBER.register({
  phone: $("r_phone").value.trim(),
  password: $("r_pw").value.trim(),   // ← 這行現在一定是 ""
  name: $("r_name").value.trim(),
  birth_y: $("r_by").value,           // ← 現在一定是 ""
  birth_m: $("r_bm").value,
  birth_d: $("r_bd").value,
  address: $("r_addr").value.trim()
});

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
