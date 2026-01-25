(() => {

window.API_URL = "https://script.google.com/macros/s/AKfycby06D9BwO2SF3CauIxlBfb2cCyEvuaMLnoOPPhwoyQh57T_wP8Al9L2fQuw2617cLF8/exec";
window.ADMIN_KEY = "10years1day911321";

const $ = id => document.getElementById(id);

function gasPost(path, payload={}, id="", method="POST") {

  const url =
    `${API_URL}?path=${path}` +
    (id ? `&id=${encodeURIComponent(id)}` : "") +
    `&key=${ADMIN_KEY}` +
    `&method=${method}`;

  return new Promise(resolve => {

    let f = document.createElement("form");
    f.method = "POST";
    f.action = url;
    f.target = "gasFrame";

    let i = document.createElement("input");
    i.name = "data";
    i.value = JSON.stringify(payload);

    f.appendChild(i);
    document.body.appendChild(f);

    document.querySelector("iframe[name=gasFrame]").onload = () => resolve();

    f.submit();
  });
}

/* ===== Settings ===== */

async function saveSettings(){

  await gasPost("settings_update",{
    shipping_enabled: $("sShipEnabled").value==="true",
    shipping_fee:Number($("sShipFee").value||0),
    free_shipping_threshold:Number($("sFreeOver").value||0),
    first_purchase_discount:Number($("sFirstRate").value||1),
    birthday_discount:Number($("sBdayRate").value||1),
  });

  $("toastSettings").textContent="已儲存 ✅";
}

/* ===== Coupons ===== */

async function saveCoupon(){

  const payload={
    code:$("cCode").value.trim().toUpperCase(),
    enabled:$("cEnabled").value==="true",
    type:$("cType").value,
    rate:Number($("cRate").value||0),
    amount:Number($("cAmount").value||0),
    minSpend:Number($("cMinSpend").value||0),
    startAt:$("cStartAt").value,
    endAt:$("cEndAt").value,
    oncePerMember:$("cOnce").value==="true",
    maxUses:Number($("cMaxUses").value||0),
    note:$("cNote").value
  };

  const editing = $("cCode").disabled;

  if(editing){
    await gasPost("coupons",payload,payload.code,"PUT");
  }else{
    await gasPost("coupons",payload,"","POST");
  }

  location.reload();
}

async function deleteCoupon(){

  const code=$("cCode").value.trim().toUpperCase();

  if(!confirm("確定刪除 "+code+"？")) return;

  await gasPost("coupons",{},code,"DELETE");

  location.reload();
}

document.addEventListener("DOMContentLoaded",()=>{

$("btnSaveSettings").onclick=saveSettings;
$("btnSave").onclick=saveCoupon;
$("btnDelete").onclick=deleteCoupon;

});

})();
