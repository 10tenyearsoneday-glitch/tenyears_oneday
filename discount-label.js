// discount-label.js — TEN YEARS ONE DAY (UI ONLY)

import { num } from "./pricing.js";

/**
 * 依照 pricing.js 的規則，產生「人類可讀」的折扣說明
 * @param {object} settings
 * @param {object} ctx
 * @returns {string[]} labels
 */
export function buildDiscountLabels(settings, ctx = {}) {
  const labels = [];

  /* === 首購 / 生日（責一，取折數較大） === */
  const candidates = [];

  if (ctx.firstPurchase && settings.first_purchase_discount) {
    candidates.push({
      label: "首購優惠",
      rate: num(settings.first_purchase_discount, 1),
    });
  }

  if (ctx.birthday && settings.birthday_discount) {
    candidates.push({
      label: "生日優惠",
      rate: num(settings.birthday_discount, 1),
    });
  }

  if (candidates.length > 0) {
    const best = candidates.sort((a, b) => a.rate - b.rate)[0];
    labels.push(`${best.label} ${Math.round(best.rate * 100)} 折`);
  }

  /* === 優惠碼（可疊） === */
  if (ctx.coupon && ctx.coupon.code) {
    labels.push(`優惠碼 ${ctx.coupon.code}`);
  }

  return labels;
}
window.TEN_DISCOUNT_LABEL = {
  buildDiscountLabels
};
