
/* =====================================================
 * TEN YEARS ONE DAY - FINAL STABLE include.js
 * ✔ 保留原本 header / nav / style 行為
 * ✔ 只負責對接 GAS API
 * ===================================================== */

const GAS_BASE = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
const ADMIN_KEY = "10years1day911321";

/* ---------- utils ---------- */
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
    body: JSON.stringify(body||{})
  });
  return await r.json();
}

/* ---------- products ---------- */
async function fetchProductsByCategory(category){
  const res = await apiGet({ path:"products" });
  if(!res.ok) return [];
  return res.products.filter(p => String(p.category).trim() === category);
}

/* ---------- coupons ---------- */
async function fetchCoupons(){
  const res = await apiGet({ path:"coupons" });
  return res.ok ? res : { ok:false };
}
async function validateCoupon(code, memberId, subtotal){
  return await apiGet({
    path:"coupon_validate",
    code, memberId, subtotal
  });
}

/* ---------- member ---------- */
async function memberLogin(phone,password){
  const r = await apiPost("member_login",{phone,password});
  if(r.ok) localStorage.setItem("token", r.token);
  return r;
}
async function memberRegister(data){
  const r = await apiPost("member_register",data);
  if(r.ok) localStorage.setItem("token", r.token);
  return r;
}
async function memberMe(){
  const token = localStorage.getItem("token");
  if(!token) return null;
  const r = await apiGet({ path:"member_me", token });
  return r.ok ? r.member : null;
}

/* ---------- cart ---------- */
function getCart(){ return JSON.parse(localStorage.getItem("cart")||"[]"); }
function saveCart(c){ localStorage.setItem("cart", JSON.stringify(c)); }
function addToCart(p,qty){
  const c = getCart();
  const ex = c.find(x=>x.id===p.id);
  if(ex) ex.qty += qty;
  else c.push({ id:p.id, title:p.title, price:p.price, qty });
  saveCart(c);
  alert("已加入購物車");
}

/* ---------- order ---------- */
async function createOrder(order){
  return await apiPost("order_create", order, ADMIN_KEY);
}

/* expose */
window.API = {
  fetchProductsByCategory,
  fetchCoupons,
  validateCoupon,
  memberLogin,
  memberRegister,
  memberMe,
  getCart,
  addToCart,
  createOrder
};
