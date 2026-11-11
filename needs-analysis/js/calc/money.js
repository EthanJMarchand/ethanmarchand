export function readMoney(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

export function formatDollars(value) {
  return formatMoney(Math.round(Number.isFinite(value) ? value : 0));
}

export function formatMoney(value) {
  const number = Number.isFinite(value) ? value : 0;
  const cents = Math.abs(number - Math.round(number)) > 0.001;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(number);
}

export function futureValue(present, rate, years) {
  if (present <= 0) return 0;
  if (years <= 0) return present;
  if (rate <= -1) return 0;
  return present * (1 + rate) ** years;
}
