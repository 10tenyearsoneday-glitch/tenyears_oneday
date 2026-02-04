// discount-label.js FINAL SAFE

window.TEN_DISCOUNT_LABEL = {
  buildDiscountLabels(pricing){
    if(!pricing) return;
    document.querySelectorAll("[data-discount-note]").forEach(e=>{
      e.textContent = pricing.discountNote || "";
    });
  }
};

(async()=>{
  if(!window.__TEN_PRICING__){
    console.warn("[TEN] pricing not loaded before discount-label");
    return;
  }
  const p = await window.__TEN_PRICING__();
  window.TEN_DISCOUNT_LABEL.buildDiscountLabels(p);
})();
