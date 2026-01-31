
// include-member.js FINAL (single GAS)
(() => {
const GAS="https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";

function jsonp(url){
 return new Promise(res=>{
  const cb="cb"+Date.now();
  window[cb]=d=>{delete window[cb];res(d)};
  const s=document.createElement("script");
  s.src=url+(url.includes("?")?"&":"?")+"callback="+cb;
  document.body.appendChild(s);
 })
}

window.Member={
 async me(token){
  return jsonp(GAS+"?path=me&token="+token)
 },
 async login(phone,pw){
  return jsonp(GAS+"?path=login&phone="+phone+"&pw="+pw)
 },
 async register(p){ 
  const q=new URLSearchParams(p).toString();
  return jsonp(GAS+"?path=register&"+q)
 }
};
})();
