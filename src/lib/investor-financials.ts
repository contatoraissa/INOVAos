export function financialMonth({
  subscribers,
  ticket,
  fixedCosts,
  variablePerSubscriber,
  revenueTaxPercent,
  paymentPercent,
}: {
  subscribers: number;
  ticket: number;
  fixedCosts: number;
  variablePerSubscriber: number;
  revenueTaxPercent: number;
  paymentPercent: number;
}) {
  const revenue = subscribers * ticket;
  const revenueTaxes = (revenue * revenueTaxPercent) / 100;
  const netRevenue = revenue - revenueTaxes;
  const variableCosts = subscribers * variablePerSubscriber + (revenue * paymentPercent) / 100;
  const contribution = netRevenue - variableCosts;
  const ebitda = contribution - fixedCosts;
  const perSubscriber =
    ticket * (1 - (revenueTaxPercent + paymentPercent) / 100) - variablePerSubscriber;
  return {
    revenue,
    revenueTaxes,
    netRevenue,
    variableCosts,
    contribution,
    fixedCosts,
    operatingCosts: fixedCosts + variableCosts,
    ebitda,
    margin: netRevenue > 0 ? (ebitda / netRevenue) * 100 : null,
    breakEven: perSubscriber > 0 ? Math.ceil(fixedCosts / perSubscriber) : null,
  };
}
