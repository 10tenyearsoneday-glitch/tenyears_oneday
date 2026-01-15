// include-member.js — FINAL GLOBAL VERSION

const MEMBER_API =
  "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";

// ✅ 一定要掛在 window
window.jsonp = function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    window[cb] = (data) => {
      delete window[cb];
      resolve(data);
    };
    const s = document.createElement("script");
    s.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
    s.onerror = reject;
    document.body.appendChild(s);
  });
};

// ===== token helpers =====
window.getMemberToken = () => localStorage.getItem("ten_token");
window.setMemberToken = (t) => localStorage.setItem("ten_token", t);
window.clearMemberToken = () => localStorage.removeItem("ten_token");

// ===== me =====
window.fetchMe = async function () {
  const token = getMemberToken();
  if (!token) throw new Error("NO_TOKEN");

  const res = await jsonp(`${MEMBER_API}?path=me&token=${token}`);
  if (!res.ok) throw new Error("NOT_LOGIN");
  return res.profile;
};
