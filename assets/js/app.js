
/* tenyears_oneday - static store (localStorage) */
const STORE_KEY = "tyod_store_v1";
const SESSION_KEY = "tyod_session_v1";

const seed = {
  settings: {
    currency: "TWD",
    shippingFee: 60,
    freeShippingThreshold: 1000,
    promoTextTop: "你可以在這裡放活動訊息（之後我也能做成可隨時改）",
    promoTextBottom: "可再加一段提醒（可自行增加內容）",
    firstBuyDiscount: 0.10,   // 9折
    birthdayDiscount: 0.15,   // 85折
  },
  products: [
    {
      id: "P001",
      name: "純銀小月亮項鍊",
      status: "上架",
      category: "純銀飾品",
      type: "項鍊",
      price: 1280,
      variants: ["45cm", "50cm"],
      images: [
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=70"
      ],
      description: "簡約純銀小月亮，日常百搭。",
      code: "SL-MOON-01",
      vendor: "示範廠商"
    },
    {
      id: "P002",
      name: "細緻珍珠手鏈",
      status: "上架",
      category: "全系列",
      type: "手鏈",
      price: 980,
      variants: ["S", "M", "L"],
      images: [
        "https://images.unsplash.com/photo-1519682577862-22b62b24e493?auto=format&fit=crop&w=1200&q=70"
      ],
      description: "柔和珍珠光澤，溫柔氣質。",
      code: "BR-PEARL-02",
      vendor: "示範廠商"
    },
    {
      id: "P003",
      name: "小花耳環",
      status: "上架",
      category: "全系列",
      type: "耳環",
      price: 690,
      variants: ["針式", "夾式"],
      images: [
        "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1200&q=70"
      ],
      description: "可愛小花，點亮穿搭。",
      code: "ER-FLOW-03",
      vendor: "示範廠商"
    }
  ],
  members: [],
  orders: []
};

function loadStore(){
  const raw = localStorage.getItem(STORE_KEY);
  if(!raw){
    localStorage.setItem(STORE_KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }
  try{
    const data = JSON.parse(raw);
    // lightweight migration defaults
    data.settings ||= seed.settings;
    data.products ||= [];
    data.members ||= [];
    data.orders ||= [];
    return data;
  }catch(e){
    localStorage.setItem(STORE_KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }
}
function saveStore(data){
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function getSession(){
  const raw = localStorage.getItem(SESSION_KEY);
  if(!raw) return {memberId:null,isAdmin:false};
  try{return JSON.parse(raw);}catch(e){return {memberId:null,isAdmin:false};}
}
function setSession(s){ localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function logout(){ setSession({memberId:null,isAdmin:false}); location.href = rel("index.html"); }

function fmt(n, cur="TWD"){ 
  try { return new Intl.NumberFormat("zh-TW",{style:"currency",currency:cur,maximumFractionDigits:0}).format(n); }
  catch(e){ return `${n} ${cur}`; }
}

function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function rel(path){
  // keep relative links working on GitHub Pages subpaths
  const base = document.documentElement.getAttribute("data-base") || "";
  return base + path;
}

function getCart(){
  return JSON.parse(localStorage.getItem("tyod_cart_v1")||"[]");
}
function setCart(items){
  localStorage.setItem("tyod_cart_v1", JSON.stringify(items));
  updateCartBadge();
}
function cartCount(){
  return getCart().reduce((a,it)=>a+Number(it.qty||0),0);
}
function updateCartBadge(){
  const n = cartCount();
  const badge = qs("#cartBadge");
  if(badge){ badge.textContent = n; badge.style.display = n? "grid":"none"; }
}
function addToCart(productId, variant, qty){
  const items = getCart();
  const key = `${productId}__${variant||""}`;
  const found = items.find(i=>i.key===key);
  if(found) found.qty += qty;
  else items.push({key, productId, variant: variant||"", qty});
  setCart(items);
}

function renderHeader(active){
  // active: 'about'|'all'|'silver'|'promo'|'knowledge'|'faq'
  const map = {
    about: "關於我們",
    all: "全系列🌸",
    silver:"純銀飾品✨",
    promo:"優惠活動🎁",
    knowledge:"飾品小知識💡",
    faq:"相關問題❗️",
  };
  qsa(".pill").forEach(p=>{
    const k = p.getAttribute("data-key");
    p.classList.toggle("active", k===active);
  });
  const title = qs("#pageTitle");
  if(title) title.textContent = map[active] || "";
}

function icons(){
  return {
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
    </svg>`,
    cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M6 6h15l-1.5 8.5H7.5L6 6Z"/><path d="M6 6l-1-3H2"/><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/>
    </svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>
    </svg>`,
    ig:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>
    </svg>`,
    line:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 12c0-4 4-7 8-7s8 3 8 7-4 7-8 7H9l-4 2 1.2-3.5C4.8 16.4 4 14.3 4 12Z"/>
    </svg>`
  };
}

function initCommon(activeKey){
  renderHeader(activeKey);
  updateCartBadge();

  const store = loadStore();
  const s = store.settings;

  const aTop = qs("#announceTopText");
  if(aTop) aTop.textContent = s.promoTextTop || "";
  const aBottom = qs("#announceBottomText");
  if(aBottom) aBottom.textContent = s.promoTextBottom || "";

  const cartBtn = qs("#cartBtn");
  if(cartBtn){
    cartBtn.addEventListener("click", ()=> location.href = rel("cart.html"));
  }
  const memberBtn = qs("#memberBtn");
  if(memberBtn){
    memberBtn.addEventListener("click", ()=> location.href = rel("member.html"));
  }
  const igBtn = qs("#igBtn");
  if(igBtn) igBtn.addEventListener("click", ()=> window.open("https://www.instagram.com/tenyears_oneday?igsh=MW9hcjBnaTdjNzc0MQ%3D%3D&utm_source=qr","_blank"));
  const lineBtn = qs("#lineBtn");
  if(lineBtn) lineBtn.addEventListener("click", ()=> window.open("https://line.me/R/ti/p/@396kwrga","_blank"));

  const searchBtn = qs("#searchBtn");
  if(searchBtn){
    searchBtn.addEventListener("click", ()=>{
      const q = prompt("搜尋商品名稱（示範）");
      if(!q) return;
      location.href = rel("all.html?q="+encodeURIComponent(q));
    });
  }

  // keyboard: / to search
  document.addEventListener("keydown", (e)=>{
    if(e.key==="/" && !/input|textarea|select/i.test(document.activeElement?.tagName||"")){
      e.preventDefault();
      searchBtn?.click();
    }
  });

  // session UI
  const sess = getSession();
  const memberHint = qs("#memberHint");
  if(memberHint){
    if(sess.memberId){
      const m = store.members.find(x=>x.id===sess.memberId);
      const name = m?.name || "會員";
      const isBirthdayMonth = m?.birthdayMonth && (Number(m.birthdayMonth)=== (new Date().getMonth()+1));
      memberHint.innerHTML = `已登入：${esc(name)}${isBirthdayMonth?' 🎂':''}　<button class="btn secondary" id="logoutBtn" style="margin-left:8px;padding:6px 10px;border-radius:12px;">登出</button>`;
      qs("#logoutBtn")?.addEventListener("click", logout);
    }else{
      memberHint.innerHTML = `尚未登入　<a class="btn secondary" href="${rel('member.html')}" style="padding:6px 10px;border-radius:12px;display:inline-block;">登入/註冊</a>`;
    }
  }
}

function filterProducts(store, pageKey, subtype, query){
  let list = store.products.filter(p=>p.status!=="下架");
  if(pageKey==="silver") list = list.filter(p=>p.category==="純銀飾品");
  if(pageKey==="all") list = list.filter(p=>p.category==="全系列" || p.category==="純銀飾品");
  if(subtype && subtype!=="全部") list = list.filter(p=>p.type===subtype);
  if(query){
    const q = query.trim().toLowerCase();
    list = list.filter(p=>(p.name||"").toLowerCase().includes(q));
  }
  return list;
}

function renderProductGrid(list, mountId){
  const store = loadStore();
  const s = store.settings;
  const el = qs(mountId);
  if(!el) return;
  if(!list.length){
    el.innerHTML = `<div class="help">目前沒有商品（你可以到後台新增）。</div>`;
    return;
  }
  el.innerHTML = list.map(p=>{
    const img = (p.images && p.images[0]) ? `<img src="${esc(p.images[0])}" alt="${esc(p.name)}">` : `<div class="help">No image</div>`;
    return `
      <div class="product">
        <a class="img" href="${rel('product.html?id='+encodeURIComponent(p.id))}">${img}</a>
        <div class="pbody">
          <div class="name">${esc(p.name)}</div>
          <div class="meta">${esc(p.category)} · ${esc(p.type)} · ${esc(p.status||"")}</div>
          <div class="row">
            <div class="price">${fmt(Number(p.price||0), s.currency)}</div>
            <a class="btn secondary" href="${rel('product.html?id='+encodeURIComponent(p.id))}">查看</a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function getParam(name){
  return new URLSearchParams(location.search).get(name);
}

/* Product detail */
function initProductPage(){
  initCommon("");
  const store = loadStore();
  const s = store.settings;
  const id = getParam("id");
  const p = store.products.find(x=>x.id===id);
  const mount = qs("#productDetail");
  if(!mount){ return; }
  if(!p){
    mount.innerHTML = `<div class="card"><div class="help">找不到商品。</div></div>`;
    return;
  }
  document.title = `${p.name}｜十年一日`;
  const imgs = (p.images||[]).map((u,i)=>`<img src="${esc(u)}" alt="${esc(p.name)} ${i+1}" style="width:100%;border-radius:18px;cursor:pointer" data-img="${esc(u)}">`).join("");
  const variantOptions = (p.variants||[]).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  mount.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="row" style="gap:12px">
          <div style="flex:1">
            <h2 style="margin:0 0 6px">${esc(p.name)}</h2>
            <div class="help">${esc(p.category)} · ${esc(p.type)}</div>
          </div>
          <div style="font-weight:800;font-size:18px">${fmt(Number(p.price||0), s.currency)}</div>
        </div>
        <div style="margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px" id="imgGrid">${imgs}</div>
        <div class="help" style="margin-top:10px">${esc(p.description||"")}</div>
      </div>
      <div class="card">
        <div class="form">
          <div class="field">
            <label>款式</label>
            <select id="variantSel">${variantOptions || `<option value="">單一款式</option>`}</select>
          </div>
          <div class="field">
            <label>數量</label>
            <input id="qty" type="number" min="1" value="1">
          </div>
          <button class="btn" id="addBtn">加入購物車</button>
          <a class="btn secondary" href="${rel('cart.html')}">前往購物車</a>
          <div class="help">提示：此模板為純前端示範。正式上線需後端/金流。</div>
        </div>
      </div>
    </div>
  `;
  qs("#addBtn")?.addEventListener("click", ()=>{
    const variant = qs("#variantSel")?.value || "";
    const qty = Math.max(1, Number(qs("#qty")?.value||1));
    addToCart(p.id, variant, qty);
    alert("已加入購物車");
  });
  // lightbox
  qsa("#imgGrid img").forEach(img=>{
    img.addEventListener("click", ()=>{
      const u = img.getAttribute("data-img");
      const m = qs("#imgModal");
      const mi = qs("#modalImg");
      if(m && mi){
        mi.src = u;
        m.classList.add("open");
      }
    });
  });
  qs("#imgModalClose")?.addEventListener("click", ()=> qs("#imgModal")?.classList.remove("open"));
  qs("#imgModal")?.addEventListener("click", (e)=>{ if(e.target.classList.contains("modal")) qs("#imgModal")?.classList.remove("open"); });
}

/* Cart & checkout */
function calcDiscounts(store, member, subtotal){
  const s = store.settings;
  let discount = 0;
  let lines = [];
  // first buy
  if(member && (member.orderCount||0)===0){
    const d = subtotal * (s.firstBuyDiscount||0);
    discount += d;
    lines.push(`首購優惠：-${fmt(Math.round(d), s.currency)}`);
  }
  // birthday month
  const nowM = new Date().getMonth()+1;
  if(member && Number(member.birthdayMonth)===nowM){
    const d = (subtotal - discount) * (s.birthdayDiscount||0);
    discount += d;
    lines.push(`當月壽星 🎂：-${fmt(Math.round(d), s.currency)}`);
  }
  return {discount: Math.round(discount), lines};
}

function initCartPage(){
  initCommon("");
  const store = loadStore();
  const s = store.settings;
  const mount = qs("#cartMount");
  if(!mount) return;

  const sess = getSession();
  const member = sess.memberId ? store.members.find(m=>m.id===sess.memberId) : null;

  const cart = getCart();
  const items = cart.map(it=>{
    const p = store.products.find(x=>x.id===it.productId);
    if(!p) return null;
    return {
      ...it,
      name: p.name,
      price: Number(p.price||0),
      image: (p.images||[])[0]||"",
    };
  }).filter(Boolean);

  function render(){
    const subtotal = items.reduce((a,it)=>a + it.price*it.qty, 0);
    const shippingMethod = qs("#shipMethod")?.value || "7-11";
    const shippingFee = (subtotal>= (s.freeShippingThreshold||1000)) ? 0 : (s.shippingFee||60);
    const disc = calcDiscounts(store, member, subtotal);
    const total = Math.max(0, subtotal + shippingFee - disc.discount);

    mount.innerHTML = `
      <div class="card">
        <div class="row">
          <h2 style="margin:0">購物車</h2>
          <div class="help">幣別：${esc(s.currency)}　${member?`｜已登入：${esc(member.name||"")}${(Number(member.birthdayMonth)=== (new Date().getMonth()+1))?' 🎂':''}`:"｜尚未登入"}</div>
        </div>

        ${items.length? `
          <div style="margin-top:10px;overflow:auto">
            <table class="table">
              <thead><tr><th>商品</th><th>款式</th><th>單價</th><th>數量</th><th>小計</th><th></th></tr></thead>
              <tbody>
                ${items.map((it,idx)=>`
                  <tr>
                    <td>
                      <div style="display:flex;gap:10px;align-items:center">
                        <div style="width:56px;height:42px;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.6)">
                          ${it.image?`<img src="${esc(it.image)}" style="width:100%;height:100%;object-fit:cover">`:""}
                        </div>
                        <div>
                          <div style="font-weight:600">${esc(it.name)}</div>
                          <div class="help">${esc(it.productId)}</div>
                        </div>
                      </div>
                    </td>
                    <td>${esc(it.variant||"")}</td>
                    <td>${fmt(it.price, s.currency)}</td>
                    <td>
                      <input type="number" min="1" value="${it.qty}" data-idx="${idx}" class="qtyInput" style="width:72px">
                    </td>
                    <td>${fmt(it.price*it.qty, s.currency)}</td>
                    <td><button class="btn secondary delBtn" data-idx="${idx}">刪除</button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="grid-2">
              <div class="card" style="padding:18px">
                <div class="field">
                  <label>配送方式（結帳）</label>
                  <select id="shipMethod">
                    <option value="7-11">7-11 超商取貨</option>
                    <option value="Family">全家 超商取貨</option>
                    <option value="Home">宅配到府</option>
                  </select>
                </div>
                <div class="help" style="margin-top:8px">
                  7-11門市查詢：<a href="https://emap.pcsc.com.tw/emap.aspx" target="_blank" style="text-decoration:underline">開啟</a><br>
                  全家門市查詢：<a href="https://www.family.com.tw/Marketing/zh/Map" target="_blank" style="text-decoration:underline">開啟</a>
                </div>
                <div class="form" style="margin-top:10px">
                  <div class="field"><label>收件人姓名</label><input id="shipName" value="${esc(member?.name||"")}"></div>
                  <div class="field"><label>電話</label><input id="shipPhone" value="${esc(member?.phone||"")}"></div>
                  <div class="field"><label>配送地址 / 門市資訊</label><textarea id="shipAddr" rows="3" placeholder="宅配：完整地址；超商：門市名稱＋店號＋地址">${esc(member?.address||"")}</textarea></div>
                </div>
              </div>

              <div class="card" style="padding:18px">
                <div class="kv">
                  <div>商品小計</div><div>${fmt(subtotal, s.currency)}</div>
                  <div>運費</div><div>${fmt(shippingFee, s.currency)} <span class="help">（滿 ${fmt(s.freeShippingThreshold||1000, s.currency)} 免運）</span></div>
                  <div>優惠</div><div>${disc.lines.length?disc.lines.map(l=>`<div>${esc(l)}</div>`).join(""):`<span class="help">（登入會員才會自動帶入首購/壽星折扣）</span>`}</div>
                  <div><b>總額</b></div><div><b>${fmt(total, s.currency)}</b></div>
                </div>
                <div class="row" style="margin-top:12px">
                  <button class="btn secondary" id="clearCartBtn">清空購物車</button>
                  <button class="btn" id="placeOrderBtn" ${member? "":"disabled"}>確認下單</button>
                </div>
                ${member?`<div class="help" style="margin-top:8px">下單後可到「會員」查看訂單。</div>`:`<div class="help" style="margin-top:8px">必須登入會員才可下單：<a href="${rel('member.html')}" style="text-decoration:underline">前往登入/註冊</a></div>`}
              </div>
            </div>
          </div>
        ` : `
          <div class="help" style="margin-top:10px">購物車目前是空的。</div>
          <a class="btn" href="${rel('all.html')}" style="display:inline-block;margin-top:12px">去逛商品</a>
        `}
      </div>
    `;

    // set method
    const sm = qs("#shipMethod");
    if(sm){
      sm.value = shippingMethod;
      sm.addEventListener("change", render);
    }

    qsa(".qtyInput").forEach(inp=>{
      inp.addEventListener("change", ()=>{
        const idx = Number(inp.getAttribute("data-idx"));
        const v = Math.max(1, Number(inp.value||1));
        items[idx].qty = v;
        // sync to cart storage
        const c = getCart();
        c[idx].qty = v;
        setCart(c);
        render();
      });
    });

    qsa(".delBtn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const idx = Number(btn.getAttribute("data-idx"));
        items.splice(idx,1);
        const c = getCart();
        c.splice(idx,1);
        setCart(c);
        render();
      });
    });

    qs("#clearCartBtn")?.addEventListener("click", ()=>{
      if(confirm("清空購物車？")){
        setCart([]);
        location.reload();
      }
    });

    qs("#placeOrderBtn")?.addEventListener("click", ()=>{
      const name = (qs("#shipName")?.value||"").trim();
      const phone = (qs("#shipPhone")?.value||"").trim();
      const addr = (qs("#shipAddr")?.value||"").trim();
      if(!name || !phone || !addr){
        alert("請填寫收件人姓名、電話、配送地址/門市資訊。");
        return;
      }
      const orderId = "O" + Date.now().toString().slice(-8) + Math.floor(Math.random()*90+10);
      const order = {
        id: orderId,
        createdAt: new Date().toISOString(),
        memberId: member.id,
        items: items.map(it=>({productId:it.productId, variant:it.variant, qty:it.qty, price:it.price, name:it.name})),
        subtotal,
        shippingMethod,
        shippingFee,
        discount: disc.discount,
        total,
        shipTo: {name, phone, addr},
        status: "已成立"
      };
      store.orders.unshift(order);
      // bump member info (address/phone) and orderCount
      member.phone = phone;
      member.address = addr;
      member.orderCount = (member.orderCount||0) + 1;
      saveStore(store);
      setCart([]);
      alert(`下單成功！訂單編號：${orderId}`);
      location.href = rel("member.html");
    });
  }

  render();
}

/* Member */
function initMemberPage(){
  initCommon("");
  const store = loadStore();
  const sess = getSession();

  const mount = qs("#memberMount");
  if(!mount) return;

  const member = sess.memberId ? store.members.find(m=>m.id===sess.memberId) : null;

  if(!member){
    mount.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <h2>會員登入</h2>
          <div class="form">
            <div class="field"><label>手機號碼</label><input id="loginPhone" placeholder="09xxxxxxxx"></div>
            <div class="field"><label>密碼</label><input id="loginPass" type="password"></div>
            <button class="btn" id="loginBtn">登入</button>
            <div class="help">必須登入會員才可下單。登入後可查看訂單、修改基本資料（生日除外）。</div>
          </div>
        </div>
        <div class="card">
          <h2>會員註冊</h2>
          <div class="form">
            <div class="field"><label>姓名</label><input id="regName"></div>
            <div class="field"><label>手機號碼</label><input id="regPhone" placeholder="09xxxxxxxx"></div>
            <div class="field"><label>密碼</label><input id="regPass" type="password"></div>
            <div class="grid-2" style="grid-template-columns:1fr 1fr">
              <div class="field"><label>生日（月）</label>
                <select id="regBM">${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}</select>
              </div>
              <div class="field"><label>生日（日）</label>
                <select id="regBD">${Array.from({length:31},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}</select>
              </div>
            </div>
            <div class="field"><label>地址</label><textarea id="regAddr" rows="3"></textarea></div>
            <button class="btn" id="regBtn">註冊</button>
            <div class="help">註冊完成會自動跳轉到資料頁面。</div>
          </div>
        </div>
      </div>
    `;

    qs("#loginBtn")?.addEventListener("click", ()=>{
      const phone = (qs("#loginPhone")?.value||"").trim();
      const pass = (qs("#loginPass")?.value||"").trim();
      const m = store.members.find(x=>x.phone===phone && x.password===pass);
      if(!m){ alert("手機號碼或密碼錯誤。"); return; }
      setSession({memberId:m.id,isAdmin:false});
      location.reload();
    });

    qs("#regBtn")?.addEventListener("click", ()=>{
      const name = (qs("#regName")?.value||"").trim();
      const phone = (qs("#regPhone")?.value||"").trim();
      const pass = (qs("#regPass")?.value||"").trim();
      const addr = (qs("#regAddr")?.value||"").trim();
      const bm = Number(qs("#regBM")?.value||0);
      const bd = Number(qs("#regBD")?.value||0);
      if(!name || !phone || !pass || !addr || !bm || !bd){
        alert("請完整填寫資料。");
        return;
      }
      if(store.members.some(x=>x.phone===phone)){
        alert("此手機號碼已註冊。");
        return;
      }
      const id = "M" + Date.now().toString().slice(-8) + Math.floor(Math.random()*90+10);
      store.members.unshift({
        id, name, phone, password: pass, address: addr,
        birthdayMonth: bm, birthdayDay: bd,
        createdAt: new Date().toISOString(),
        orderCount: 0
      });
      saveStore(store);
      setSession({memberId:id,isAdmin:false});
      location.reload();
    });

    return;
  }

  const isBirthdayMonth = Number(member.birthdayMonth) === (new Date().getMonth()+1);
  const orders = store.orders.filter(o=>o.memberId===member.id);

  mount.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="row">
          <h2 style="margin:0">會員資料${isBirthdayMonth?' 🎂':''}</h2>
          <button class="btn secondary" id="logoutBtn">登出</button>
        </div>
        <div class="form" style="margin-top:10px">
          <div class="field"><label>姓名</label><input id="mName" value="${esc(member.name||"")}"></div>
          <div class="field"><label>手機號碼（不可改）</label><input value="${esc(member.phone||"")}" disabled></div>
          <div class="field"><label>生日（不可改）</label><input value="${esc(member.birthdayMonth)}月${esc(member.birthdayDay)}日" disabled></div>
          <div class="field"><label>地址</label><textarea id="mAddr" rows="3">${esc(member.address||"")}</textarea></div>
          <div class="field"><label>修改密碼（留空不改）</label><input id="mPass" type="password" placeholder="新密碼"></div>
          <button class="btn" id="saveProfileBtn">儲存</button>
          <div class="help">你只能修改基本資料（生日除外）。</div>
        </div>
      </div>

      <div class="card">
        <h2>我的訂單</h2>
        ${orders.length? `
          <div style="overflow:auto">
            <table class="table">
              <thead><tr><th>訂單編號</th><th>商品</th><th>金額</th><th>狀態</th><th>時間</th></tr></thead>
              <tbody>
                ${orders.map(o=>`
                  <tr>
                    <td><b>${esc(o.id)}</b></td>
                    <td>${o.items.map(it=>`${esc(it.name)} × ${it.qty}`).join("<br>")}</td>
                    <td>${fmt(o.total, store.settings.currency)}</td>
                    <td>${esc(o.status)}</td>
                    <td>${new Date(o.createdAt).toLocaleString("zh-TW")}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div class="help">詳細資料：收件人姓名、電話、配送地址、訂單總額等會顯示在後台管理。</div>
        ` : `<div class="help">目前沒有訂單。</div>`}
      </div>
    </div>
  `;

  qs("#logoutBtn")?.addEventListener("click", logout);
  qs("#saveProfileBtn")?.addEventListener("click", ()=>{
    member.name = (qs("#mName")?.value||"").trim();
    member.address = (qs("#mAddr")?.value||"").trim();
    const newPass = (qs("#mPass")?.value||"").trim();
    if(newPass) member.password = newPass;
    saveStore(store);
    alert("已儲存。");
    location.reload();
  });
}

/* Pages: All / Silver */
function initListPage(pageKey){
  initCommon(pageKey);
  const store = loadStore();
  const subtype = getParam("type") || "全部";
  const q = getParam("q") || "";
  const list = filterProducts(store, pageKey, subtype, q);
  renderProductGrid(list, "#productGrid");

  const typeSel = qs("#typeSel");
  if(typeSel){
    typeSel.value = subtype;
    typeSel.addEventListener("change", ()=>{
      location.href = rel(`${pageKey}.html?type=` + encodeURIComponent(typeSel.value) + (q?`&q=${encodeURIComponent(q)}`:""));
    });
  }
  const searchHint = qs("#searchHint");
  if(searchHint){
    searchHint.textContent = q ? `搜尋：${q}` : "";
  }
}

/* Admin */
function adminIsLoggedIn(){
  return getSession().isAdmin === true;
}
function requireAdmin(){
  if(!adminIsLoggedIn()){
    location.href = rel("admin/login.html");
    return false;
  }
  return true;
}
function initAdminLogin(){
  initCommon("");
  const mount = qs("#adminLoginMount");
  if(!mount) return;
  mount.innerHTML = `
    <div class="card" style="max-width:560px;margin:0 auto">
      <h2>管理者登入</h2>
      <div class="form">
        <div class="field"><label>帳號</label><input id="aUser" value=""></div>
        <div class="field"><label>密碼</label><input id="aPass" type="password" value=""></div>
        <button class="btn" id="aLoginBtn">登入</button>
        <div class="help">提醒：此模板為純前端示範（帳密會出現在前端），正式營運請改為後端驗證。</div>
      </div>
    </div>
  `;
  qs("#aLoginBtn")?.addEventListener("click", ()=>{
    const u = (qs("#aUser")?.value||"").trim();
    const p = (qs("#aPass")?.value||"").trim();
    // hardcoded per user's requirement
    if(u==="tenyears_oneday" && p==="09110321"){
      setSession({memberId:null,isAdmin:true});
      location.href = rel("admin/dashboard.html");
    }else{
      alert("帳號或密碼錯誤");
    }
  });
}

function initAdminDashboard(){
  if(!requireAdmin()) return;
  initCommon("");

  const store = loadStore();
  const mount = qs("#adminMount");
  if(!mount) return;

  function render(){
    const s = store.settings;
    mount.innerHTML = `
      <div class="card">
        <div class="row">
          <h2 style="margin:0">後台管理</h2>
          <div class="row">
            <button class="btn secondary" id="resetBtn">重置示範資料</button>
            <button class="btn secondary" id="adminLogoutBtn">登出</button>
          </div>
        </div>

        <div class="section">
          <div class="section-title">網站設定（可隨時更改）</div>
          <div class="grid-2">
            <div class="card" style="padding:16px">
              <div class="form">
                <div class="field"><label>公告（上）</label><input id="setPromoTop" value="${esc(s.promoTextTop||"")}"></div>
                <div class="field"><label>公告（下）</label><input id="setPromoBottom" value="${esc(s.promoTextBottom||"")}"></div>
                <div class="grid-2" style="grid-template-columns:1fr 1fr">
                  <div class="field"><label>運費</label><input id="setShipFee" type="number" value="${Number(s.shippingFee||60)}"></div>
                  <div class="field"><label>免運門檻</label><input id="setFreeShip" type="number" value="${Number(s.freeShippingThreshold||1000)}"></div>
                </div>
                <button class="btn" id="saveSettingsBtn">儲存設定</button>
              </div>
            </div>

            <div class="card" style="padding:16px">
              <div class="help">
                會員管理：<b>${store.members.length}</b> 人（可看訂單數量）<br>
                訂單管理：<b>${store.orders.length}</b> 筆（可刪除訂單）<br><br>
                ※ 會員看不到後台「新增/刪除」按鈕。<br>
                ※ 正式上線請用後端保存資料與金流。
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">商品管理</div>
          <div class="card" style="padding:16px">
            <div class="row">
              <div class="help">可新增商品名稱、狀態、分類、金額、款式（隔行），圖片網址（可多張），編碼/廠商（僅管理員看）。</div>
              <button class="btn" id="newProdBtn">新增商品</button>
            </div>
            <div style="overflow:auto;margin-top:10px">
              <table class="table">
                <thead>
                  <tr><th>ID</th><th>名稱</th><th>分類</th><th>類型</th><th>狀態</th><th>金額</th><th>編碼/廠商</th><th></th></tr>
                </thead>
                <tbody>
                  ${store.products.map(p=>`
                    <tr>
                      <td>${esc(p.id)}</td>
                      <td>${esc(p.name)}</td>
                      <td>${esc(p.category)}</td>
                      <td>${esc(p.type)}</td>
                      <td>${esc(p.status)}</td>
                      <td>${fmt(Number(p.price||0), s.currency)}</td>
                      <td><div class="help">${esc(p.code||"")}<br>${esc(p.vendor||"")}</div></td>
                      <td>
                        <button class="btn secondary editProdBtn" data-id="${esc(p.id)}">修改</button>
                        <button class="btn secondary delProdBtn" data-id="${esc(p.id)}">刪除</button>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">會員管理（訂單數量）</div>
          <div class="card" style="padding:16px;overflow:auto">
            <table class="table">
              <thead><tr><th>姓名</th><th>手機</th><th>生日</th><th>地址</th><th>訂單數量</th></tr></thead>
              <tbody>
                ${store.members.map(m=>`
                  <tr>
                    <td>${esc(m.name)}${(Number(m.birthdayMonth)=== (new Date().getMonth()+1))?' 🎂':''}</td>
                    <td>${esc(m.phone)}</td>
                    <td>${esc(m.birthdayMonth)}月${esc(m.birthdayDay)}日</td>
                    <td>${esc(m.address||"")}</td>
                    <td>${Number(m.orderCount||0)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <div class="section-title">訂單管理（可刪除）</div>
          <div class="card" style="padding:16px;overflow:auto">
            <table class="table">
              <thead><tr><th>訂單編號</th><th>會員</th><th>商品</th><th>配送</th><th>金額</th><th>時間</th><th></th></tr></thead>
              <tbody>
                ${store.orders.map(o=>{
                  const m = store.members.find(x=>x.id===o.memberId);
                  return `
                    <tr>
                      <td><b>${esc(o.id)}</b><div class="help">${esc(o.status||"")}</div></td>
                      <td>${esc(m?.name||"")}<div class="help">${esc(o.shipTo?.phone||"")}</div></td>
                      <td>${o.items.map(it=>`${esc(it.name)} × ${it.qty}`).join("<br>")}</td>
                      <td>
                        <div class="help">
                          ${esc(o.shippingMethod)}<br>
                          ${esc(o.shipTo?.name||"")}｜${esc(o.shipTo?.addr||"")}
                        </div>
                      </td>
                      <td>
                        <div class="help">小計 ${fmt(o.subtotal, s.currency)}<br>運費 ${fmt(o.shippingFee, s.currency)}<br>優惠 -${fmt(o.discount, s.currency)}</div>
                        <b>${fmt(o.total, s.currency)}</b>
                      </td>
                      <td>${new Date(o.createdAt).toLocaleString("zh-TW")}</td>
                      <td><button class="btn secondary delOrderBtn" data-id="${esc(o.id)}">刪除</button></td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="modal" id="prodModal">
        <div class="panel">
          <header>
            <div style="font-weight:700" id="prodModalTitle">商品</div>
            <button class="close" id="prodModalClose">✕</button>
          </header>
          <div class="form">
            <div class="grid-2" style="grid-template-columns:1fr 1fr">
              <div class="field"><label>ID（英數）</label><input id="pId"></div>
              <div class="field"><label>狀態</label>
                <select id="pStatus">
                  <option>上架</option><option>下架</option>
                </select>
              </div>
            </div>
            <div class="field"><label>商品名稱</label><input id="pName"></div>
            <div class="grid-2" style="grid-template-columns:1fr 1fr">
              <div class="field"><label>分類</label>
                <select id="pCat"><option>全系列</option><option>純銀飾品</option></select>
              </div>
              <div class="field"><label>類型</label>
                <select id="pType"><option>項鍊</option><option>手鏈</option><option>耳環</option><option>戒指</option></select>
              </div>
            </div>
            <div class="field"><label>金額</label><input id="pPrice" type="number"></div>
            <div class="field"><label>款式（每行一個）</label><textarea id="pVars" rows="3" placeholder="例如：45cm&#10;50cm"></textarea></div>
            <div class="field"><label>圖片網址（每行一張，可多張）</label><textarea id="pImgs" rows="3" placeholder="https://..."></textarea></div>
            <div class="field"><label>商品介紹</label><textarea id="pDesc" rows="4"></textarea></div>
            <div class="grid-2" style="grid-template-columns:1fr 1fr">
              <div class="field"><label>編碼（僅管理員）</label><input id="pCode"></div>
              <div class="field"><label>廠商（僅管理員）</label><input id="pVendor"></div>
            </div>
            <div class="row">
              <button class="btn secondary" id="cancelProdBtn">取消</button>
              <button class="btn" id="saveProdBtn">儲存</button>
            </div>
          </div>
        </div>
      </div>
    `;

    qs("#adminLogoutBtn")?.addEventListener("click", ()=>{ setSession({memberId:null,isAdmin:false}); location.href = rel("index.html"); });
    qs("#resetBtn")?.addEventListener("click", ()=>{
      if(confirm("重置為示範資料？（會覆蓋目前的商品/訂單/會員）")){
        localStorage.setItem(STORE_KEY, JSON.stringify(seed));
        localStorage.removeItem("tyod_cart_v1");
        alert("已重置");
        location.reload();
      }
    });

    qs("#saveSettingsBtn")?.addEventListener("click", ()=>{
      store.settings.promoTextTop = qs("#setPromoTop")?.value || "";
      store.settings.promoTextBottom = qs("#setPromoBottom")?.value || "";
      store.settings.shippingFee = Number(qs("#setShipFee")?.value||60);
      store.settings.freeShippingThreshold = Number(qs("#setFreeShip")?.value||1000);
      saveStore(store);
      alert("已儲存設定");
    });

    qsa(".delOrderBtn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-id");
        if(confirm("刪除訂單 "+id+"？")){
          const idx = store.orders.findIndex(o=>o.id===id);
          if(idx>=0) store.orders.splice(idx,1);
          saveStore(store);
          render();
        }
      });
    });

    const modal = qs("#prodModal");
    const openModal = ()=> modal?.classList.add("open");
    const closeModal = ()=> modal?.classList.remove("open");
    qs("#prodModalClose")?.addEventListener("click", closeModal);
    qs("#cancelProdBtn")?.addEventListener("click", closeModal);
    modal?.addEventListener("click",(e)=>{ if(e.target.classList.contains("modal")) closeModal(); });

    let editingId = null;

    qs("#newProdBtn")?.addEventListener("click", ()=>{
      editingId = null;
      qs("#prodModalTitle").textContent = "新增商品";
      qs("#pId").value = "P" + Math.floor(Math.random()*900+100);
      qs("#pId").disabled = false;
      qs("#pStatus").value = "上架";
      qs("#pName").value = "";
      qs("#pCat").value = "全系列";
      qs("#pType").value = "項鍊";
      qs("#pPrice").value = 0;
      qs("#pVars").value = "";
      qs("#pImgs").value = "";
      qs("#pDesc").value = "";
      qs("#pCode").value = "";
      qs("#pVendor").value = "";
      openModal();
    });

    qsa(".editProdBtn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-id");
        const p = store.products.find(x=>x.id===id);
        if(!p) return;
        editingId = id;
        qs("#prodModalTitle").textContent = "修改商品";
        qs("#pId").value = p.id; qs("#pId").disabled = true;
        qs("#pStatus").value = p.status || "上架";
        qs("#pName").value = p.name || "";
        qs("#pCat").value = p.category || "全系列";
        qs("#pType").value = p.type || "項鍊";
        qs("#pPrice").value = Number(p.price||0);
        qs("#pVars").value = (p.variants||[]).join("\n");
        qs("#pImgs").value = (p.images||[]).join("\n");
        qs("#pDesc").value = p.description || "";
        qs("#pCode").value = p.code || "";
        qs("#pVendor").value = p.vendor || "";
        openModal();
      });
    });

    qsa(".delProdBtn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-id");
        if(confirm("刪除商品 "+id+"？")){
          const idx = store.products.findIndex(p=>p.id===id);
          if(idx>=0) store.products.splice(idx,1);
          saveStore(store);
          render();
        }
      });
    });

    qs("#saveProdBtn")?.addEventListener("click", ()=>{
      const id = (qs("#pId").value||"").trim();
      const name = (qs("#pName").value||"").trim();
      const status = qs("#pStatus").value;
      const category = qs("#pCat").value;
      const type = qs("#pType").value;
      const price = Number(qs("#pPrice").value||0);
      const variants = (qs("#pVars").value||"").split("\n").map(x=>x.trim()).filter(Boolean);
      const images = (qs("#pImgs").value||"").split("\n").map(x=>x.trim()).filter(Boolean);
      const description = (qs("#pDesc").value||"").trim();
      const code = (qs("#pCode").value||"").trim();
      const vendor = (qs("#pVendor").value||"").trim();

      if(!id || !name){ alert("請填寫 ID 與 商品名稱"); return; }

      if(!editingId){
        if(store.products.some(p=>p.id===id)){ alert("ID 已存在"); return; }
        store.products.unshift({id,name,status,category,type,price,variants,images,description,code,vendor});
      }else{
        const p = store.products.find(x=>x.id===editingId);
        if(!p) return;
        Object.assign(p,{name,status,category,type,price,variants,images,description,code,vendor});
      }
      saveStore(store);
      closeModal();
      render();
    });
  }

  render();
}

/* About (home) content blocks */
function initHomePage(){
  initCommon("about");
}

/* static info pages */
function initPromoPage(){
  initCommon("promo");
}
function initFaqPage(){
  initCommon("faq");
}
function initKnowledgePage(){
  initCommon("knowledge");
}

/* Expose in window for inline onload */
window.TYOD = {
  initHomePage,
  initListPage,
  initProductPage,
  initCartPage,
  initMemberPage,
  initAdminLogin,
  initAdminDashboard,
  initPromoPage,
  initKnowledgePage,
  initFaqPage,
  rel,
  fmt
};
