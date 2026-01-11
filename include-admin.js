// include-admin.js (products admin)
// Supports: list products (GET ?path=products), upsert (POST ?path=products&method=upsert&key=...), delete (POST ?path=products&method=delete&key=...&id=...)
// UI: search/filter + modal create/edit, category/series selects, optional base64 image file attach.

(() => {
  if (window.TEN_ADMIN_LOADED) return;
  window.TEN_ADMIN_LOADED = true;

  const API_URL = (window.TEN_CONFIG && window.TEN_CONFIG.products_gas_url) || "";
  const ADMIN_KEY = window.TEN_ADMIN_KEY || "10years1day911321";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ===== DOM map (must match admin.html) =====
  const DOM = {
    tbody: () => $("productsTbody"),
    q: () => $("q"),
    seriesFilter: () => $("fSeriesFilter"),
    statusFilter: () => $("fStatusFilter"),
    count: () => $("count"),
    syncState: () => $("syncState"),

    // modal
    bd: () => $("modalBd"),
    title: () => $("modalTitle"),
    form: () => $("prodForm"),
    toast: () => $("toast"),
    btnOpenCreate: () => $("btnOpenCreate"),
    btnReload: () => $("btnReload"),
    btnCloseModal: () => $("btnCloseModal"),
    btnCancel: () => $("btnCancel"),
    btnSave: () => $("btnSave"),
    btnDelete: () => $("btnDelete"),

    fId: () => $("fId"),
    fTitle: () => $("fTitle"),
    fSeries: () => $("fSeries"),
    fCategory: () => $("fCategory"),
    fPrice: () => $("fPrice"),
    fStatus: () => $("fStatus"),
    fImage: () => $("fImage"),
    fImages: () => $("fImages"),
    fDesc: () => $("fDesc"),

    fImageFile: () => $("fImageFile"),
    fImagesFiles: () => $("fImagesFiles"),
    fImageData: () => $("fImageData"),
    fImagesData: () => $("fImagesData"),
    prevMain: () => $("prevMain"),
    prevMore: () => $("prevMore"),
  };

  function hasRequiredDom() {
    const need = ["productsTbody","q","fSeriesFilter","fStatusFilter","btnOpenCreate","btnReload","modalBd","prodForm"];
    return need.every(id => document.getElementById(id));
  }

  // ===== GAS helpers (same style as your coupons admin) =====
  async function gasGet(path, params = {}) {
    if (!API_URL) throw new Error("NO_API_URL");
    const u = new URL(API_URL);
    u.searchParams.set("path", path);
    Object.entries(params || {}).forEach(([k,v]) => {
      if (v !== undefined && v !== null && String(v) !== "") u.searchParams.set(k, String(v));
    });
    const res = await fetch(u.toString(), { cache: "no-store" });
    const out = await res.json().catch(() => null);
    if (!res.ok) throw new Error(out?.error || ("HTTP_" + res.status));
    return out;
  }

  async function gasPost(path, method, bodyObj, id) {
    if (!API_URL) throw new Error("NO_API_URL");
    const u = new URL(API_URL);
    u.searchParams.set("path", path);
    u.searchParams.set("method", method);
    u.searchParams.set("key", ADMIN_KEY);
    if (id) u.searchParams.set("id", String(id));
    const res = await fetch(u.toString(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(bodyObj || {})
    });
    const out = await res.json().catch(() => null);
    if (!res.ok || out?.ok === false) throw new Error(out?.error || ("HTTP_" + res.status));
    return out;
  }

  // ===== State =====
  let ALL = [];
  let EDITING_ID = null;

  function setSync(text) {
    const el = DOM.syncState();
    if (el) el.textContent = text;
  }
  function toast(msg, ok=true) {
    const el = DOM.toast();
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
  }

  function normalizeRow(p) {
    return {
      id: String(p?.id ?? p?._id ?? "").trim(),
      title: String(p?.title ?? ""),
      series: String(p?.series ?? ""),
      category: String(p?.category ?? ""),
      price: Number(p?.price ?? 0),
      status: String(p?.status ?? "ON"),
      image: String(p?.image ?? ""),
      images: Array.isArray(p?.images) ? p.images : (String(p?.images ?? "").split(",").map(s=>s.trim()).filter(Boolean)),
      desc: String(p?.desc ?? ""),
      updatedAt: String(p?.updatedAt ?? p?.updated_at ?? "")
    };
  }

  function applyFilters() {
    const q = String(DOM.q()?.value || "").trim().toLowerCase();
    const s = String(DOM.seriesFilter()?.value || "").trim();
    const st = String(DOM.statusFilter()?.value || "").trim();

    return ALL.filter(p => {
      if (s && p.series !== s) return false;
      if (st && String(p.status).toUpperCase() !== st) return false;
      if (!q) return true;
      const hay = `${p.id} ${p.title} ${p.series} ${p.category}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function renderTable() {
    const tbody = DOM.tbody();
    if (!tbody) return;

    const rows = applyFilters();
    if (DOM.count()) DOM.count().textContent = String(rows.length);

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted" style="padding:14px;">沒有資料</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(p => {
      const img = p.image || "assets/placeholder.png";
      const statusPill = p.status === "ON"
        ? `<span class="pill">ON</span>`
        : `<span class="pill" style="border-color:rgba(138,59,59,.35);color:#8a3b3b;">OFF</span>`;

      return `
        <tr data-id="${esc(p.id)}">
          <td><img class="img-sm" src="${esc(img)}" alt=""></td>
          <td>
            <div style="font-weight:900">${esc(p.title || "(未命名)")}</div>
            <div class="muted">${esc(p.id)}</div>
          </td>
          <td>
            <div><b>${esc(p.series || "-")}</b></div>
            <div class="muted">${esc(p.category || "-")}</div>
          </td>
          <td>${esc(p.price)}</td>
          <td>${statusPill}</td>
          <td class="muted">${esc(p.updatedAt || "-")}</td>
          <td>
            <div class="row-actions">
              <button class="btn mini" type="button" data-edit="${esc(p.id)}">編輯</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // ===== Modal open/close =====
  function openModal(mode, p) {
    const bd = DOM.bd();
    if (!bd) return;

    EDITING_ID = (mode === "edit") ? (p?.id || null) : null;
    const isEdit = !!EDITING_ID;

    DOM.title().textContent = isEdit ? "編輯商品" : "新增商品";
    DOM.btnDelete().style.display = isEdit ? "inline-flex" : "none";

    DOM.fId().value = p?.id || "";
    DOM.fId().disabled = isEdit; // id 不允許改（避免亂掉）
    DOM.fTitle().value = p?.title || "";
    DOM.fSeries().value = p?.series || "全系列";
    DOM.fCategory().value = p?.category || "其他";
    DOM.fPrice().value = (p?.price ?? "") === 0 ? "0" : String(p?.price ?? "");
    DOM.fStatus().value = String(p?.status || "ON").toUpperCase() === "OFF" ? "OFF" : "ON";
    DOM.fImage().value = p?.image || "";
    DOM.fImages().value = (Array.isArray(p?.images) ? p.images.join(", ") : (p?.images || "")) || "";
    DOM.fDesc().value = p?.desc || "";

    DOM.fImageData().value = "";
    DOM.fImagesData().value = "";

    renderPreviews();

    bd.classList.add("open");
    bd.setAttribute("aria-hidden", "false");
    toast("");
  }

  function closeModal() {
    const bd = DOM.bd();
    if (!bd) return;
    bd.classList.remove("open");
    bd.setAttribute("aria-hidden", "true");
    EDITING_ID = null;
  }

  function renderPreviews() {
    const main = DOM.prevMain();
    const more = DOM.prevMore();
    if (main) main.innerHTML = "";
    if (more) more.innerHTML = "";

    const mUrl = String(DOM.fImage().value || "").trim();
    if (mUrl && main) main.innerHTML = `<img class="img-sm" src="${esc(mUrl)}" alt="">`;

    const imgs = String(DOM.fImages().value || "")
      .split(",").map(s=>s.trim()).filter(Boolean).slice(0, 12);

    if (imgs.length && more) {
      more.innerHTML = imgs.map(u => `<img class="img-sm" src="${esc(u)}" alt="">`).join("");
    }
  }

  // ===== File -> base64 (optional) =====
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error("READ_FAIL"));
      fr.onload = () => resolve(String(fr.result || ""));
      fr.readAsDataURL(file);
    });
  }

  async function bindFileInputs() {
    const f1 = DOM.fImageFile();
    const f2 = DOM.fImagesFiles();

    if (f1) {
      f1.addEventListener("change", async () => {
        const file = f1.files && f1.files[0];
        if (!file) return;
        try {
          const dataUrl = await fileToDataUrl(file);
          DOM.fImageData().value = dataUrl;
          // 預覽：用 dataUrl，不動你原本 image URL 欄位
          DOM.prevMain().innerHTML = `<img class="img-sm" src="${esc(dataUrl)}" alt="">`;
        } catch (e) {
          toast("讀取圖片失敗", false);
        }
      });
    }

    if (f2) {
      f2.addEventListener("change", async () => {
        const files = Array.from(f2.files || []).slice(0, 8);
        if (!files.length) return;
        try {
          const dataUrls = [];
          for (const file of files) dataUrls.push(await fileToDataUrl(file));
          DOM.fImagesData().value = JSON.stringify(dataUrls);
          DOM.prevMore().innerHTML = dataUrls.map(u => `<img class="img-sm" src="${esc(u)}" alt="">`).join("");
        } catch (e) {
          toast("讀取多張圖片失敗", false);
        }
      });
    }
  }

  // ===== CRUD =====
  async function loadProducts() {
    setSync("載入中…");
    const out = await gasGet("products");
    const arr = Array.isArray(out) ? out : (Array.isArray(out?.items) ? out.items : []);
    ALL = arr.map(normalizeRow).filter(p => p.id);
    setSync("已載入");
    renderTable();
  }

  function buildPayloadFromForm() {
    const id = String(DOM.fId().value || "").trim();
    const title = String(DOM.fTitle().value || "").trim();
    const series = String(DOM.fSeries().value || "").trim();
    const category = String(DOM.fCategory().value || "").trim();
    const price = Number(DOM.fPrice().value || 0);
    const status = String(DOM.fStatus().value || "ON").trim().toUpperCase() === "OFF" ? "OFF" : "ON";
    const image = String(DOM.fImage().value || "").trim();
    const images = String(DOM.fImages().value || "").split(",").map(s=>s.trim()).filter(Boolean);
    const desc = String(DOM.fDesc().value || "").trim();

    if (!id) return { ok:false, error:"ID_REQUIRED" };
    if (!title) return { ok:false, error:"TITLE_REQUIRED" };
    if (!Number.isFinite(price) || price < 0) return { ok:false, error:"PRICE_INVALID" };

    // optional base64
    const imageData = String(DOM.fImageData().value || "").trim(); // data:image/...
    const imagesData = String(DOM.fImagesData().value || "").trim(); // JSON array

    const payload = {
      id, title, series, category, price, status,
      image, images,
      desc,
      updatedAt: new Date().toISOString(),
      // 下面兩個「可有可無」：若你的 GAS 會把 base64 存 Drive 可用；不支援就忽略
      image_data: imageData || "",
      images_data: imagesData || ""
    };

    return { ok:true, payload };
  }

  async function saveCurrent() {
    toast("");
    const { ok, payload, error } = buildPayloadFromForm();
    if (!ok) {
      const map = {
        ID_REQUIRED: "請填商品 ID",
        TITLE_REQUIRED: "請填商品名稱",
        PRICE_INVALID: "價格不正確"
      };
      toast(map[error] || ("表單錯誤：" + error), false);
      return;
    }

    const btn = DOM.btnSave();
    btn.disabled = true;

    try {
      // upsert: 使用 id 當 key
      await gasPost("products", "upsert", payload, payload.id);
      toast("✅ 已儲存", true);
      closeModal();
      await loadProducts();
    } catch (e) {
      console.error(e);
      toast("儲存失敗：" + (e?.message || "SERVER_ERROR"), false);
    } finally {
      btn.disabled = false;
    }
  }

  async function deleteCurrent() {
    if (!EDITING_ID) return;
    if (!confirm("確定要刪除這個商品嗎？")) return;

    const btn = DOM.btnDelete();
    btn.disabled = true;

    try {
      await gasPost("products", "delete", {}, EDITING_ID);
      toast("✅ 已刪除", true);
      closeModal();
      await loadProducts();
    } catch (e) {
      console.error(e);
      toast("刪除失敗：" + (e?.message || "SERVER_ERROR"), false);
    } finally {
      btn.disabled = false;
    }
  }

  // ===== Bindings =====
  function bind() {
    DOM.btnOpenCreate()?.addEventListener("click", () => openModal("create", {}));
    DOM.btnReload()?.addEventListener("click", () => loadProducts().catch(err => toast("載入失敗：" + err.message, false)));

    DOM.btnCloseModal()?.addEventListener("click", closeModal);
    DOM.btnCancel()?.addEventListener("click", closeModal);

    DOM.bd()?.addEventListener("click", (e) => {
      if (e.target === DOM.bd()) closeModal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    DOM.q()?.addEventListener("input", renderTable);
    DOM.seriesFilter()?.addEventListener("change", renderTable);
    DOM.statusFilter()?.addEventListener("change", renderTable);

    DOM.form()?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveCurrent();
    });

    DOM.btnDelete()?.addEventListener("click", deleteCurrent);

    DOM.fImage()?.addEventListener("input", renderPreviews);
    DOM.fImages()?.addEventListener("input", renderPreviews);

    DOM.tbody()?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-edit]");
      if (!btn) return;
      const id = btn.getAttribute("data-edit");
      const p = ALL.find(x => x.id === id);
      if (!p) return;
      openModal("edit", p);
    });
  }

  window.addEventListener("DOMContentLoaded", async () => {
    if (!hasRequiredDom()) {
      console.warn("[include-admin] missing required DOM nodes.");
      return;
    }
    bind();
    await bindFileInputs();
    try {
      await loadProducts();
    } catch (e) {
      console.error(e);
      toast("載入失敗：" + (e?.message || "SERVER_ERROR"), false);
      setSync("載入失敗");
    }
  });
})();
