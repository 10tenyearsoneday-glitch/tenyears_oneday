// discount-label.js — GLOBAL

(function () {
  if (!window.TEN_PRICING) {
    console.error("[TEN] pricing not loaded before discount-label");
    return;
  }

  function buildDiscountLabels(info) {
    const out = [];
    if (info.discountLabel) out.push(info.discountLabel);
    return out;
  }

  window.TEN_DISCOUNT_LABEL = {
    buildDiscountLabels,
  };
})();
