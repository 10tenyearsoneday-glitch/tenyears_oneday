(() => {
  if (window.TEN_MEMBER_LOADED) return;
  window.TEN_MEMBER_LOADED = true;

  const MEMBERS_GAS =
    "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";

  function $(id) {
    return document.getElementById(id);
  }

  function toast(msg, ok = false) {
    const el = $("memberToast");
    if (!el) return alert(msg);
    el.textContent = msg;
    el.style.color = ok ? "#4b6b4b" : "#8a3b3b";
  }

  /* =============================
     註冊
  ============================== */
  async function registerMember() {
    const phone = $("mPhone")?.value.trim();
    const password = $("mPassword")?.value.trim();
    const name = $("mName")?.value.trim();
    const address = $("mAddress")?.value.trim();
    const y = $("birthY")?.value;
    const m = $("birthM")?.value;
    const d = $("birthD")?.value;

    if (!phone || !password || !name) {
      toast("請填寫所有必填欄位");
      return;
    }

    const payload = {
      path: "member_register",
      phone,
      password,
      name,
      address,
      birthday: `${y}-${m}-${d}`,
    };

    try {
      toast("註冊中…");

      const res = await fetch(MEMBERS_GAS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const out = await res.json();

      if (!out.ok) {
        toast(out.error || "註冊失敗");
        return;
      }

      localStorage.setItem("ten_member_id", out.memberId);
      toast("註冊成功，已登入", true);

      setTimeout(() => {
        location.href = "member-profile.html";
      }, 600);
    } catch (e) {
      console.error(e);
      toast("系統錯誤");
    }
  }

  /* =============================
     登入
  ============================== */
  async function loginMember() {
    const phone = $("lPhone")?.value.trim();
    const password = $("lPassword")?.value.trim();

    if (!phone || !password) {
      toast("請輸入手機與密碼");
      return;
    }

    try {
      toast("登入中…");

      const res = await fetch(
        `${MEMBERS_GAS}?path=member_login&phone=${encodeURIComponent(
          phone
        )}&password=${encodeURIComponent(password)}`,
        { cache: "no-store" }
      );

      const out = await res.json();

      if (!out.ok) {
        toast(out.error || "登入失敗");
        return;
      }

      localStorage.setItem("ten_member_id", out.memberId);
      toast("登入成功", true);

      setTimeout(() => {
        location.href = "member-profile.html";
      }, 600);
    } catch (e) {
      console.error(e);
      toast("系統錯誤");
    }
  }

  /* =============================
     綁定按鈕
  ============================== */
  window.addEventListener("DOMContentLoaded", () => {
    $("btnRegister")?.addEventListener("click", registerMember);
    $("btnLogin")?.addEventListener("click", loginMember);
  });
})();
