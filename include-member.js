// include-member.js — TEN YEARS ONE DAY (JSONP FINAL)

const MEMBER_GAS_URL =
  "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";

/* =========================
   Utils
========================= */
function qs(id) {
  return document.getElementById(id);
}

function saveAuth(res) {
  localStorage.setItem("ten_member_token", res.token);
  localStorage.setItem("ten_member_id", res.memberId);
}

function getToken() {
  return localStorage.getItem("ten_member_token");
}

/* =========================
   JSONP helper
========================= */
function jsonp(path, params = {}) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const script = document.createElement("script");

    params.path = path;
    params.callback = cb;

    const qs = Object.keys(params)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join("&");

    script.src = `${MEMBER_GAS_URL}?${qs}`;

    window[cb] = (res) => {
      delete window[cb];
      script.remove();
      res && res.ok ? resolve(res) : reject(res);
    };

    script.onerror = () => {
      delete window[cb];
      script.remove();
      reject({ error: "NETWORK_ERROR" });
    };

    document.body.appendChild(script);
  });
}

/* =========================
   Auth actions
========================= */
async function registerMember(data) {
  const res = await jsonp("register", data);
  saveAuth(res);
  location.href = "member-profile.html";
}

async function loginMember(data) {
  const res = await jsonp("login", data);
  saveAuth(res);
  location.href = "member-profile.html";
}

async function logoutMember() {
  const token = getToken();
  if (token) await jsonp("logout", { token });
  localStorage.removeItem("ten_member_token");
  localStorage.removeItem("ten_member_id");
  location.href = "member.html";
}

async function fetchMe() {
  const token = getToken();
  if (!token) throw { error: "NO_TOKEN" };
  return jsonp("me", { token });
}
