<script>
const MEMBER_API = "https://script.google.com/macros/s/AKfycbxV6GCa_MUn-s-bNMH7Y7HJzF1DL1oJ2mb9taU8tGprY8fqb-DxknfFfOBzRWHi3RZzMw/exec";

function jsonp(url){
  return new Promise((ok,fail)=>{
    const cb = "cb_"+Math.random().toString(36).slice(2);
    window[cb]=res=>{ delete window[cb]; ok(res); };
    const s=document.createElement("script");
    s.src = url + "&callback=" + cb;
    s.onerror = ()=>fail();
    document.body.appendChild(s);
  });
}

function getToken(){ return localStorage.getItem("ten_token"); }
function setToken(t){ localStorage.setItem("ten_token",t); }

async function fetchMe(){
  const t=getToken();
  if(!t) throw 1;
  const r=await jsonp(`${MEMBER_API}?path=me&token=${t}`);
  if(!r.ok) throw 1;
  return r.profile;
}
</script>
