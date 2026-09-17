import Decimal from 'decimal.js';

// CLP: cada línea se redondea a pesos; IVA se calcula sobre la suma redondeada.
export function calculateTotals(lines, taxRate) {
  const amounts = lines.map(line => new Decimal(line.quantity).mul(line.unitPrice).toDecimalPlaces(0, Decimal.ROUND_HALF_UP));
  const subtotal = amounts.reduce((sum, amount) => sum.plus(amount), new Decimal(0));
  const tax = subtotal.mul(taxRate).div(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return { lineTotals: amounts.map(String), subtotal: String(subtotal), tax: String(tax), total: String(subtotal.plus(tax)) };
}
