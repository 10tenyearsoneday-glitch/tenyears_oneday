// include-admin.fixed.js
// Admin products management for 十年一日 (Ten Years One Day)
// Requires: include-common.js (defines API_URL, ADMIN_KEY, TEN_CONFIG, toast helpers)

(() => {
  if (window.TEN_ADMIN_PRODUCTS_LOADED) return;
  window.TEN_ADMIN_PRODUCTS_LOADED = true;

  // ---- helpers ----
  const $ = (id) => document.getElementById(id);

  const API_URL = window.API_URL || (window.TEN_CONFIG && window.TEN_CONFIG.products_gas_url) || "";
  const ADMIN_KEY = window.ADMIN_KEY || "10years1day911321";

  function safeText(s) { return String(s ?? "").trim(); }
  function num(n, d=0) {
    const x = Number(n);
    return Number.isFinite(x) ? x : d;
  }
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toast(el, msg, ok=true) {
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok ? "rgba(47,58,44,.85)" : "#8a3b3b";
  }

  async function gasGet(path) {
    if (!API_URL) throw new Error("NO_API_URL");
    const url = `${API_URL}?path=${encodeURIComponent(path)}`;
    const res = await fetch(url, { cache: "no-store" });
    const out = await res.json().catch(() => null);
    if (!res.ok) throw new Error(out?.error || ("HTTP_" + res.status));
    return out;
  }

  async function gasPost(path, method, body) {
    if (!API_URL) throw new Error("NO_API_URL");
    const url =
      `${API_URL}?path=${encodeURIComponent(path)}` +
      `&key=${encodeURIComponent(ADMIN_KEY)}` +
      (method ? `&method=${encodeURIComponent(method)}` : "");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
    const out = await res.json().catch(() => null);
    if (!res.ok || !out || out.ok !== true) {
      throw new Error(out?.error || ("HTTP_" + res.status));
    }
    return out;
  }

  // ---- state ----
  let products = [];
  let toastEl;

  // ---- DOM refs (set on DOMContentLoaded) ----
  let tbl, pid, title, series, category, price, status, image, images, desc, btnSave, btnDel, btnClear, btnReload;

  function getFormValue_() {
    return {
      id: safeText(pid?.value),
      title: safeText(title?.value),
      series: safeText(series?.value),
      category: safeText(category?.value),
      price: num(price?.value, 0),
      status: safeText(status?.value) || "on",
      image: safeText(image?.value),
      images: safeText(images?.value),
      desc: safeText(desc?.value),
    };
  }

  function setFormValue_(p) {
    if (!p) return;
    pid.value = safeText(p.id || p._id || "");
    title.value = safeText(p.title || "");
    series.value = safeText(p.series || "");
    category.value = safeText(p.category || "");
    price.value = (p.price ?? "") === "" ? "" : String(p.price ?? "");
    status.value = safeText(p.status || "on");
    image.value = safeText(p.image || "");
    images.value = Array.isArray(p.images) ? p.images.join("\n") : safeText(p.images || "");
    desc.value = safeText(p.desc || "");
  }

  function clearForm_() {
    pid.value = "";
    title.value = "";
    series.value = "";
    category.value = "";
    price.value = "";
    status.value = "on";
    image.value = "";
    images.value = "";
    desc.value = "";
  }

  function rowHtml_(p) {
    const id = escapeHtml(p.id || p._id || "");
    const t = escapeHtml(p.title || "");
    const s = escapeHtml(p.series || "");
    const c = escapeHtml(p.category || "");
    const pr = escapeHtml(String(p.price ?? ""));
    const st = escapeHtml(p.status || "");
    const img = escapeHtml(p.image || "");
    const updatedAt = escapeHtml(String(p.updatedAt || ""));

    return `
      <tr>
        <td><button type="button" class="a-link" data-edit="${id}">編輯</button></td>
        <td>${id}</td>
        <td>${t}</td>
        <td>${s}</td>
        <td>${c}</td>
        <td>${pr}</td>
        <td>${st}</td>
        <td style="max-width:240px;word-break:break-all;">${img}</td>
        <td>${updatedAt}</td>
      </tr>
    `;
  }

  function renderTable_() {
    if (!tbl) return;
    const head = `
      <thead>
        <tr>
          <th>操作</th><th>id</th><th>title</th><th>series</th><th>category</th>
          <th>price</th><th>status</th><th>image</th><th>updatedAt</th>
        </tr>
      </thead>
    `;
    const body = products.length
      ? `<tbody>${products.map(rowHtml_).join("")}</tbody>`
      : `<tbody><tr><td colspan="9" style="opacity:.7;padding:12px;">目前沒有商品</td></tr></tbody>`;
    tbl.innerHTML = head + body;
  }

  async function loadProducts_() {
    toast(toastEl, "載入商品中…");
    try {
      const out = await gasGet("products");
      products = Array.isArray(out) ? out : (out?.items || out?.products || []);
      if (!Array.isArray(products)) products = [];
      renderTable_();
      toast(toastEl, `✅ 已載入 ${products.length} 筆`, true);
    } catch (e) {
      console.error(e);
      toast(toastEl, "載入失敗（請看 Console / 檢查 GAS）", false);
    }
  }

  async function saveProduct_() {
    const data = getFormValue_();

    if (!data.title) return toast(toastEl, "請輸入 title", false);
    if (!(data.price >= 0)) return toast(toastEl, "price 格式錯誤", false);

    // images：支援 textarea 每行一張
    const imgs = data.images
      ? data.images.split("\n").map(s => s.trim()).filter(Boolean)
      : [];
    data.images = imgs;

    // 沒填 id 時自動給一個（避免後端無法辨識）
    if (!data.id) data.id = "P-" + Date.now();

    toast(toastEl, "儲存中…");
    try {
      await gasPost("products", "upsert", data);
      toast(toastEl, "✅ 已儲存", true);
      await loadProducts_();
    } catch (e) {
      console.error(e);
      toast(toastEl, "儲存失敗：" + (e?.message || "ERROR"), false);
    }
  }

  async function deleteProduct_() {
    const id = safeText(pid?.value);
    if (!id) return toast(toastEl, "沒有 id，無法刪除", false);
    if (!confirm(`確定刪除商品：${id}？`)) return;

    toast(toastEl, "刪除中…");
    try {
      await gasPost("products", "delete", { id });
      toast(toastEl, "✅ 已刪除", true);
      clearForm_();
      await loadProducts_();
    } catch (e) {
      console.error(e);
      toast(toastEl, "刪除失敗：" + (e?.message || "ERROR"), false);
    }
  }

  function bindTableEdit_() {
    tbl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-edit]");
      if (!btn) return;
      const id = btn.getAttribute("data-edit");
      const p = products.find(x => String(x.id || x._id || "") === String(id));
      if (p) setFormValue_(p);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function bindButtons_() {
    btnReload?.addEventListener("click", loadProducts_);
    btnSave?.addEventListener("click", saveProduct_);
    btnDel?.addEventListener("click", deleteProduct_);
    btnClear?.addEventListener("click", () => { clearForm_(); toast(toastEl, "已清空表單", true); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // If this isn't admin page, do nothing
    if (!/admin\.html/i.test(location.pathname)) return;

    toastEl = $("toast") || $("adminToast") || null;

    tbl = $("tbl");
    pid = $("pid");
    title = $("title");
    series = $("series");
    category = $("category");
    price = $("price");
    status = $("status");
    image = $("image");
    images = $("images");
    desc = $("desc");
    btnSave = $("save");
    btnDel = $("del");
    btnClear = $("clear");
    btnReload = $("reload");

    // If key DOM missing, fail softly (avoid page crash)
    if (!tbl || !pid || !title) {
      console.warn("[include-admin] missing required DOM nodes.");
      return;
    }

    bindButtons_();
    bindTableEdit_();
    loadProducts_();
  });
})();
