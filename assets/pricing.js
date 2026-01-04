// assets/pricing.js
export function calcCheckout(items, settings, ctx){
  // items: [{ price: number, qty: number }]
  // settings: 你的 /settings 讀到的
  // ctx: { isFirstOrder: boolean, isBirthdayMonth: boolean }

  const s = {
    shipping_enabled: true,
    shipping_fee: 60,
    free_shipping_threshold: 1000,
    first_purchase_discount: 1,  // 0.9 表示 9折
    birthday_discount: 1,        // 0.85 表示 8.5折
    ...settings
  };

  const subtotal = items.reduce((sum, it) => {
    const p = Number(it.price || 0);
    const q = Math.max(1, Number(it.qty || 1));
    return sum + p * q;
  }, 0);

  // 折扣：先決定用哪個（你可改成「可疊加」）
  let rate = 1;
  let discountLabel = "";

  const firstRate = Number(s.first_purchase_discount || 1);
  const bdayRate  = Number(s.birthday_discount || 1);

  const firstEligible = !!ctx?.isFirstOrder && firstRate > 0 && firstRate < 1;
  const bdayEligible  = !!ctx?.isBirthdayMonth && bdayRate > 0 && bdayRate < 1;

  if (firstEligible && bdayEligible){
    // ✅ 兩個都符合：取更便宜的（折扣更大 => rate 更小）
    if (bdayRate < firstRate){
      rate = bdayRate;
      discountLabel = "生日月折扣";
    }else{
      rate = firstRate;
      discountLabel = "首購折扣";
    }
  }else if (bdayEligible){
    rate = bdayRate;
    discountLabel = "生日月折扣";
  }else if (firstEligible){
    rate = firstRate;
    discountLabel = "首購折扣";
  }

  const discountedSubtotal = Math.round(subtotal * rate);
  const discount = subtotal - discountedSubtotal;

  // 運費
  const fee = Number(s.shipping_fee || 0);
  const freeOver = Number(s.free_shipping_threshold || 0);

  let shipping = 0;
  if (s.shipping_enabled){
    if (freeOver > 0 && discountedSubtotal >= freeOver) shipping = 0;
    else shipping = fee;
  }else{
    shipping = 0; // 活動免運
  }

  const total = discountedSubtotal + shipping;

  // 提示文字（差多少免運）
  let shippingHint = "";
  if (s.shipping_enabled && freeOver > 0 && discountedSubtotal < freeOver){
    shippingHint = `再買 NT$${freeOver - discountedSubtotal} 即可免運`;
  }

  return {
    subtotal,
    rate,
    discount,
    discountLabel,
    discountedSubtotal,
    shipping,
    shippingHint,
    total
  };
}
