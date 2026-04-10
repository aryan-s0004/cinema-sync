export const formatPrice = (value, currency = "INR") => {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(numeric);
};

export default formatPrice;
