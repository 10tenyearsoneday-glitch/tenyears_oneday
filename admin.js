const GAS_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
const ADMIN_KEY = "10years1day911321";

/* ---------- Tabs ---------- */
document.querySelectorAll(".admin-tabs button").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".admin-tabs button").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".admin-tab").forEach(s=>s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
  };
});

/* ---------- Coupons ---------- */
const tbody = document.querySelector("#couponTable tbody");
const btnAddCoupon = document.getElementById("btnAddCoupon");

async function loadCoupons(){
  const res = await fetch(`${GAS_URL}?path=coupons`);
  const list = await res.json();
  tbody.innerHTML = list.map(c=>`
    <tr>
      <td>${c.code}</td>
      <td>${c.enabled ? "✔" : "✖"}</td>
      <td>${c.type}</td>
      <td>${c.type==="rate" ? c.rate : c.amount}</td>
      <td>${c.minSpend||0}</td>
      <td class="row-actions">
        <button onclick="delCoupon('${c.code}')">刪除</button>
      </td>
    </tr>
  `).join("");
}

async function delCoupon(code){
  if(!confirm("刪除優惠碼？")) return;
  await fetch(`${GAS_URL}?path=coupons&id=${code}&method=DELETE&key=${ADMIN_KEY}`,{method:"POST"});
  loadCoupons();
}

btnAddCoupon.onclick = async ()=>{
  const code = prompt("優惠碼 code");
  if(!code) return;
  await fetch(`${GAS_URL}?path=coupons&key=${ADMIN_KEY}`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      code,
      enabled:true,
      type:"rate",
      rate:0.9,
      minSpend:0
    })
  });
  loadCoupons();
};

/* ---------- Settings ---------- */
async function loadSettings(){
  const res = await fetch(`${GAS_URL}?path=settings`);
  const s = await res.json();
  set_shipping_fee.value = s.shipping_fee || 0;
  set_free_shipping_threshold.value = s.free_shipping_threshold || 0;
  set_first_purchase_discount.value = s.first_purchase_discount || 1;
  set_birthday_discount.value = s.birthday_discount || 1;
}

btnSaveSettings.onclick = async ()=>{
  await fetch(`${GAS_URL}?path=settings_update&key=${ADMIN_KEY}`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      shipping_fee:Number(set_shipping_fee.value),
      free_shipping_threshold:Number(set_free_shipping_threshold.value),
      first_purchase_discount:Number(set_first_purchase_discount.value),
      birthday_discount:Number(set_birthday_discount.value)
    })
  });
  alert("已儲存");
};

/* ---------- init ---------- */
loadCoupons();
loadSettings();
