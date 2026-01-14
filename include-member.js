// include-member.js — TEN YEARS ONE DAY (STABLE)

const MEMBER_GAS_URL =
  "https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxx/exec"; // ← 換成你的 Members GAS

/* =========================
   Utils
========================= */
function qs(id) {
  return document.getElementById(id);
}

function getToken() {
  return localStorage.getItem("ten_member_token");
}

function getMemberId() {
  return localStorage.getItem("ten_member_id");
}

function saveAuth(res) {
  localStorage.setItem("ten_member_token", res.token);
  localStorage.setItem("ten_member_id", res.memberId);
}

/* =========================
   API
========================= */
async function memberGet(path, params = {}) {
  const url = new URL(MEMBER_GAS_URL);
  url.searchParams.set("path", path);
  Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));

  const res = await fetch(url.toString(), { cache: "no-store" });
  return res.json();
}

/* =========================
   Auth actions
========================= */
async function registerMember(data) {
  const res = await memberGet("register", data);
  if (!res.ok) throw res;
  saveAuth(res);
  location.href = "member-profile.html";
}

async function loginMember(data) {
  const res = await memberGet("login", data);
  if (!res.ok) throw res;
  saveAuth(res);
  location.href = "member-profile.html";
}

async function logoutMember() {
  const token = getToken();
  if (token) {
    await memberGet("logout", { token });
  }
  localStorage.removeItem("ten_member_token");
  localStorage.removeItem("ten_member_id");
  location.href = "member.html";
}

async function fetchMe() {
  const token = getToken();
  if (!token) throw { error: "NO_TOKEN" };
  const res = await memberGet("me", { token });
  if (!res.ok) throw res;
  return res;
}
