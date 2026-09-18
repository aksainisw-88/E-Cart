const getProductId = (item) => String(item.id || item._id || item.product || "");

const calculateOfferDiscount = (offer, items, subtotal) => {
  if (offer.offerType === "buy_one_get_one") {
    const buyProductId = String(offer.buyProduct || "");
    const item = items.find((candidate) => getProductId(candidate) === buyProductId);
    if (!item) return 0;
    const buyQuantity = Math.max(1, Number(offer.buyQuantity) || 1);
    const freeQuantity = Math.max(1, Number(offer.freeQuantity) || 1);
    const freeUnits = Math.floor(Number(item.quantity) / (buyQuantity + freeQuantity)) * freeQuantity;
    return freeUnits * (Number(item.price) || 0);
  }

  if (offer.offerType === "buy_product_get_product") {
    const buyProductId = String(offer.buyProduct || "");
    const freeProductId = String(offer.freeProduct || "");
    const buyItem = items.find((item) => getProductId(item) === buyProductId);
    const freeItem = items.find((item) => getProductId(item) === freeProductId);
    if (!buyItem || !freeItem) return 0;
    const buyQuantity = Math.max(1, Number(offer.buyQuantity) || 1);
    const freeQuantity = Math.max(1, Number(offer.freeQuantity) || 1);
    const eligibleSets = Math.floor(Number(buyItem.quantity) / buyQuantity);
    const freeUnits = Math.min(Number(freeItem.quantity), eligibleSets * freeQuantity);
    return freeUnits * (Number(freeItem.price) || 0);
  }

  const rawDiscount = offer.discountType === "percentage"
    ? subtotal * (Number(offer.discountValue) / 100)
    : Number(offer.discountValue);
  return Math.min(subtotal, Math.max(0, rawDiscount));
};

module.exports = { calculateOfferDiscount };
