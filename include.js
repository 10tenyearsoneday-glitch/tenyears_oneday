
// === TEN YEARS ONE DAY - CONNECTED FRONTEND ===
const GAS_BASE = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
const ADMIN_KEY = "10years1day911321";

// ---------- helpers ----------
async function apiGet(params){
  const u = new URL(GAS_BASE);
  Object.keys(params).forEach(k=>u.searchParams.set(k, params[k]));
  const r = await fetch(u.toString());
  return await r.json();
}
async function apiPost(path, body, key){
  const u = new URL(GAS_BASE);
  u.searchParams.set("path", path);
  if(key) u.searchParams.set("key", key);
  const r = await fetch(u.toString(),{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body||{})
  });
  return await r.json();
}

// ---------- products ----------
async function loadProducts(){
  const res = await apiGet({ path:"products" });
  return res.ok ? res.products : [];
}

// ---------- member ----------
async function memberLogin(phone,password){
  return await apiPost("member_login",{phone,password});
}
async function memberRegister(data){
  return await apiPost("member_register",data);
}
async function memberMe(token){
  return await apiGet({ path:"member_me", token });
}

// ---------- order ----------
async function createOrder(order){
  return await apiPost("order_create", order, ADMIN_KEY);
}

window.API = {
  loadProducts,
  memberLogin,
  memberRegister,
  memberMe,
  createOrder
};
