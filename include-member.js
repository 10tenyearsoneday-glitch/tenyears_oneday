// include-member.js
// TEN YEARS ONE DAY – MEMBER ONLY (FINAL)
// 負責：會員註冊、登入、資料顯示

(() => {
  if (window.TEN_MEMBER_LOADED) return;
  window.TEN_MEMBER_LOADED = true;

  const MEMBER_KEY = "ten_member_id";

  const GAS_MEMBERS_URL =
    "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";

  const $ = (id) => document.getElementById(id);

  function setMemberId(id) {
    localStorage.setItem(MEMBER_KEY, id);
  }

  function getMemberId() {
    return localStorage.getItem(MEMBER_KEY);
  }

  /* ========= 註冊 ========= */
  async function register() {
    const name = $("m_name").value.trim();
    const phone = $("m_phone").value.trim();
    const birthday = $("m_birthday").value;

    if (!name || !phone) {
      alert("請填寫姓名與電話");
      return;
    }

    const res = await fetch(GAS_MEMBERS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "register",
        name,
        phone,
        birthday
      })
    });

    const out = await res.json();

    if (!out.ok) {
      alert(out.error || "註冊失敗");
      return;
    }

    setMemberId(out.memberId);
    alert("註冊成功");
    location.href = "member-profile.html";
  }

  /* ========= Profile ========= */
  async function loadProfile() {
    const memberId = getMemberId();
    if (!memberId) return;

    const res = await fetch(`${GAS_MEMBERS_URL}?action=get&memberId=${memberId}`);
    const m = await res.json();

    if (!m.ok) return;

    $("p_name").textContent = m.name;
    $("p_phone").textContent = m.phone;
    $("p_birthday").textContent = m.birthday || "-";
  }

  /* ========= 綁定 ========= */
  window.addEventListener("DOMContentLoaded", () => {
    if ($("memberRegisterBtn")) {
      $("memberRegisterBtn").addEventListener("click", register);
    }

    if ($("memberProfile")) {
      loadProfile();
    }
  });
})();
