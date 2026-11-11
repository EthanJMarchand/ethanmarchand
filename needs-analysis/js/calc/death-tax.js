import { inflate } from "./inflation.js";
import { futureValue } from "./money.js";
import { taxOnInclusion } from "./tax.js";

// Half of a capital gain is included in income. The non-registered gain is the
// balance minus its cost base (zero when unknown). Estate property has no cost
// base entered, so its whole value is the gain.
export const CAPITAL_GAINS_INCLUSION = 0.5;

// Brackets are today's. Balances `years` out are nominal, so each inclusion is
// brought back to today's dollars, taxed on top of today's income, and the tax is
// scaled forward again. `factor` is cumulative inflation over those years.
function sliceTax(baseIncome, inclusion, province, factor = 1) {
  if (inclusion <= 0) return { tax: 0, rate: 0 };
  const scale = factor > 0 ? factor : 1;
  const result = taxOnInclusion(baseIncome, inclusion / scale, province);
  return result ? { ...result, tax: result.tax * scale } : { tax: 0, rate: 0 };
}

// Tax if death is `years` from now. Non-registered and RRSP balances grow at the
// savings return. The estate value rises with inflation. A rollover drops the RRSP.
// otherGain is the taxable capital gain already measured on other assets (ACB known).
export function deathTaxAtYear({
  income,
  rrsp = 0,
  nonReg = 0,
  nonRegAcb = 0,
  otherGain = 0,
  estate = 0,
  rollover = false,
  province,
  savingsReturn = 0,
  inflationPercent = 0,
  years = 0,
}) {
  const elapsed = Math.max(0, years || 0);
  const baseIncome = Math.max(0, income);
  const rrspBalance = rollover ? 0 : futureValue(Math.max(0, rrsp), savingsReturn, elapsed);
  const nonRegBalance = futureValue(Math.max(0, nonReg), savingsReturn, elapsed);
  const estateValue = inflate(Math.max(0, estate), inflationPercent, elapsed);
  const nonRegInclusion = Math.max(0, nonRegBalance - Math.max(0, nonRegAcb)) * CAPITAL_GAINS_INCLUSION;
  const otherInclusion = Math.max(0, otherGain) * CAPITAL_GAINS_INCLUSION;
  const estateInclusion = estateValue * CAPITAL_GAINS_INCLUSION;
  const factor = inflate(1, inflationPercent, elapsed);
  const real = (amount) => amount / factor;
  const nonRegSlice = sliceTax(baseIncome, nonRegInclusion, province, factor);
  const otherSlice = sliceTax(baseIncome + real(nonRegInclusion), otherInclusion, province, factor);
  const estateSlice = sliceTax(baseIncome + real(nonRegInclusion + otherInclusion), estateInclusion, province, factor);
  const rrspSlice = sliceTax(
    baseIncome + real(nonRegInclusion + otherInclusion + estateInclusion),
    rrspBalance,
    province,
    factor,
  );
  return {
    rolledOver: Boolean(rollover),
    rrspBalance,
    nonRegBalance,
    estateValue,
    nonRegInclusion,
    otherInclusion,
    estateInclusion,
    rrspInclusion: rrspBalance,
    nonRegTax: nonRegSlice.tax,
    otherTax: otherSlice.tax,
    estateTax: estateSlice.tax,
    rrspTax: rrspSlice.tax,
    rrspRate: rrspSlice.rate,
    total: nonRegSlice.tax + otherSlice.tax + estateSlice.tax + rrspSlice.tax,
  };
}
