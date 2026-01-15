<!doctype html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <title>會員登入</title>
</head>
<body>

<h2>會員登入</h2>
<input id="phone" placeholder="手機">
<input id="pw" type="password" placeholder="密碼">
<button onclick="login()">登入</button>

<h3>註冊</h3>
<input id="r_phone" placeholder="手機">
<input id="r_pw" type="password" placeholder="密碼">
<input id="r_name" placeholder="姓名">
<input id="r_birth" placeholder="1997/03/21">
<button onclick="register()">註冊</button>

<!-- ✅ 一定要先載這支 -->
<script src="./include-member.js"></script>

<script>
async function login() {
  const res = await jsonp(
    `${MEMBER_API}?path=login&phone=${phone.value}&password=${pw.value}`
  );

  if (res.ok) {
    setMemberToken(res.token);
    location.href = "member-profile.html";
  } else {
    alert("登入失敗");
  }
}

async function register() {
  const res = await jsonp(
    `${MEMBER_API}?path=register&phone=${r_phone.value}&password=${r_pw.value}&name=${r_name.value}&birth=${r_birth.value}`
  );

  if (res.ok) {
    setMemberToken(res.token);
    location.href = "member-profile.html";
  } else {
    alert("註冊失敗：" + res.error);
  }
}
</script>

</body>
</html>
