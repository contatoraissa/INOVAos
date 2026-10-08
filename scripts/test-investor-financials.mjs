import { test } from "node:test";
import assert from "node:assert/strict";
import { financialMonth } from "../src/lib/investor-financials.ts";
const base = {
  subscribers: 100,
  ticket: 200,
  fixedCosts: 11500,
  variablePerSubscriber: 20,
  revenueTaxPercent: 6,
  paymentPercent: 2,
};
test("EBITDA subtracts revenue deductions, variable costs and fixed budget without double counting", () => {
  const result = financialMonth(base);
  assert.equal(result.revenue, 20000);
  assert.equal(result.revenueTaxes, 1200);
  assert.equal(result.netRevenue, 18800);
  assert.equal(result.variableCosts, 2400);
  assert.equal(result.ebitda, 4900);
  assert.equal(result.breakEven, 71);
  assert.equal(result.margin, (4900 / 18800) * 100);
});
test("zero revenue preserves fixed cost burn and does not invent a margin", () => {
  const r = financialMonth({ ...base, subscribers: 0 });
  assert.equal(r.ebitda, -11500);
  assert.equal(r.margin, null);
});
test("nonpositive contribution makes break-even unreachable", () => {
  assert.equal(financialMonth({ ...base, ticket: 0 }).breakEven, null);
  assert.equal(financialMonth({ ...base, variablePerSubscriber: 300 }).breakEven, null);
});
test("break-even rounds up to an integer number of doctors that covers all costs", () => {
  const r = financialMonth(base);
  assert.ok(financialMonth({ ...base, subscribers: r.breakEven }).ebitda >= 0);
  assert.ok(financialMonth({ ...base, subscribers: r.breakEven - 1 }).ebitda < 0);
});
