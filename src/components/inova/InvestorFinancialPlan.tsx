import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { financialMonth } from "@/lib/investor-financials";
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const initialCosts = [
  { name: "Equipe e desenvolvimento", amount: 6000 },
  { name: "Atendimento e suporte", amount: 1500 },
  { name: "Infraestrutura base e banco", amount: 500 },
  { name: "Ferramentas e licenças", amount: 400 },
  { name: "Marketing e comercial", amount: 2000 },
  { name: "Contabilidade e jurídico", amount: 800 },
  { name: "Administrativo e outros", amount: 300 },
];
const panel = "rounded-2xl border border-slate-200 bg-white p-6";
export function InvestorFinancialPlan({
  subscribers,
  ticket,
}: {
  subscribers: number;
  ticket: number;
}) {
  const [costs, setCosts] = useState(initialCosts);
  const [usage, setUsage] = useState(20),
    [tax, setTax] = useState(6),
    [fees, setFees] = useState(2);
  const [growth, setGrowth] = useState(10),
    [setup, setSetup] = useState(12000),
    [cash, setCash] = useState(50000);
  const fixed = costs.reduce((sum, cost) => sum + cost.amount, 0);
  const calculate = (count: number) =>
    financialMonth({
      subscribers: count,
      ticket,
      fixedCosts: fixed,
      variablePerSubscriber: usage,
      revenueTaxPercent: tax,
      paymentPercent: fees,
    });
  const current = calculate(subscribers);
  let balance = cash;
  const months = Array.from({ length: 12 }, (_, i) => {
    const count = subscribers + Math.trunc(growth) * i;
    const result = calculate(count);
    const investment = i === 0 ? setup : 0;
    balance += result.ebitda - investment;
    return { month: `M${i + 1}`, count, ...result, investment, balance };
  });
  const annual = months.reduce(
    (sum, m) => ({ revenue: sum.revenue + m.revenue, ebitda: sum.ebitda + m.ebitda }),
    { revenue: 0, ebitda: 0 },
  );
  const clamp = (text: string, max = 1000000) => Math.max(0, Math.min(max, Number(text) || 0));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-teal-700">
          05 · Planejamento financeiro
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Quanto custa operar. Quando a conta fecha.</h1>
        <p className="mt-3 text-sm text-slate-500">
          Orçamento ilustrativo · {subscribers} médicos × {money(ticket)}/mês no primeiro mês.
          Ajuste assinantes e ticket em Modelo de negócio.
        </p>
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        Custos iniciais são hipóteses editáveis, sem cotações ou histórico contábil. Tributos são
        premissas, não enquadramento tributário do INOVA. EBITDA não é lucro líquido nem saldo de
        caixa.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Custos fixos / mês", value: money(fixed), detail: "Orçamento recorrente" },
          {
            title: "EBITDA estimado · M1",
            value: money(current.ebitda),
            detail: "Receita líquida − custos operacionais",
          },
          {
            title: "Margem EBITDA · M1",
            value:
              current.margin === null
                ? "—"
                : `${current.margin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
            detail: "EBITDA / receita líquida",
          },
          {
            title: "Ponto de equilíbrio",
            value: current.breakEven === null ? "Não alcançável" : `${current.breakEven} médicos`,
            detail: "Ao ticket e custos deste cenário",
          },
        ].map((item) => (
          <section key={item.title} className={panel}>
            <p className="text-xs font-medium text-slate-500">{item.title}</p>
            <p className="mt-4 text-3xl font-semibold" data-financial={item.title}>
              {item.value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{item.detail}</p>
          </section>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="text-lg font-semibold">Orçamento fixo mensal</h2>
          <p className="mt-2 text-xs text-slate-500">
            Recorrente nos 12 meses; equipe deve incluir os encargos aplicáveis.
          </p>
          <div className="mt-5 space-y-3">
            {costs.map((cost, i) => (
              <label key={cost.name} className="flex items-center justify-between gap-4 text-sm">
                <span>{cost.name}</span>
                <input
                  aria-label={cost.name}
                  className="w-28 rounded-lg border border-slate-200 p-2 text-right"
                  type="number"
                  min="0"
                  max="1000000"
                  step="100"
                  value={cost.amount}
                  onChange={(e) => {
                    const amount = clamp(e.target.value);
                    setCosts((rows) =>
                      rows.map((row, index) => (index === i ? { ...row, amount } : row)),
                    );
                  }}
                />
              </label>
            ))}
          </div>
          <p className="mt-5 border-t pt-4 text-sm font-semibold">Total mensal: {money(fixed)}</p>
        </section>
        <section className={panel}>
          <h2 className="text-lg font-semibold">Variáveis e recursos planejados</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              {
                label: "IA e consumo / médico / mês (R$)",
                value: usage,
                setter: setUsage,
                max: 10000,
              },
              {
                label: "Taxas de pagamento (% da receita)",
                value: fees,
                setter: setFees,
                max: 100,
              },
              { label: "Tributos sobre faturamento (%)", value: tax, setter: setTax, max: 100 },
              {
                label: "Adições líquidas de médicos / mês",
                value: growth,
                setter: setGrowth,
                max: 10000,
              },
              {
                label: "Investimento inicial / M1 (R$)",
                value: setup,
                setter: setSetup,
                max: 1000000,
              },
              {
                label: "Caixa inicial hipotético (R$)",
                value: cash,
                setter: setCash,
                max: 10000000,
              },
            ].map((input) => (
              <label key={input.label} className="text-xs font-medium text-slate-600">
                {input.label}
                <input
                  aria-label={input.label}
                  className="mt-2 block w-full rounded-lg border border-slate-200 p-2 text-sm"
                  type="number"
                  min="0"
                  max={input.max}
                  step={input.max === 100 ? "0.1" : "1"}
                  value={input.value}
                  onChange={(e) => input.setter(clamp(e.target.value, input.max))}
                />
              </label>
            ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Consumo é incremental à infraestrutura base. Adições líquidas já descontam saídas.
            Investimento inicial é tratado como saída de caixa separada do EBITDA, sem
            depreciação/amortização modelada.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            O caixa presume recebimento e pagamento no mesmo mês. Não inclui capital de giro, juros,
            financiamentos, IR/CSLL sobre lucro ou distribuição aos sócios.
          </p>
        </section>
      </div>
      <section className={panel}>
        <h2 className="text-lg font-semibold">Demonstração operacional estimada · M1</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Receita bruta", current.revenue],
            ["(−) Tributos sobre faturamento", -current.revenueTaxes],
            ["Receita líquida", current.netRevenue],
            ["(−) Consumo e taxas", -current.variableCosts],
            ["Margem de contribuição", current.contribution],
            ["(−) Custos fixos", -fixed],
            ["EBITDA estimado", current.ebitda],
            ["EBITDA acumulado · 12 meses", annual.ebitda],
          ].map(([label, amount]) => (
            <div
              key={String(label)}
              className={`rounded-xl p-4 ${String(label).startsWith("EBITDA") ? "bg-[#102b3d] text-white" : "bg-slate-50"}`}
            >
              <p className="text-xs">{label}</p>
              <p className="mt-2 text-xl font-semibold">{money(Number(amount))}</p>
            </div>
          ))}
        </div>
      </section>
      <section className={panel}>
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Plano de 12 meses</h2>
            <p className="mt-2 text-xs text-slate-500">
              Crescimento constante hipotético. Receita acumulada: {money(annual.revenue)}.
            </p>
          </div>
        </div>
        <div className="mt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={months}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${Number(v) / 1000} mil`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Legend />
              <Line
                name="Receita bruta"
                dataKey="revenue"
                stroke="#0891a0"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                name="EBITDA estimado"
                dataKey="ebitda"
                stroke="#7c3aed"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                name="Caixa simplificado"
                dataKey="balance"
                stroke="#e87924"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <caption className="sr-only">Orçamento mensal do cenário</caption>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  "Mês",
                  "Médicos",
                  "Receita bruta",
                  "Custos + tributos",
                  "EBITDA",
                  "Investimento",
                  "Caixa final",
                ].map((label) => (
                  <th key={label} className="p-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-b border-slate-100">
                  <td className="p-3">{m.month}</td>
                  <td className="p-3">{m.count}</td>
                  <td className="p-3">{money(m.revenue)}</td>
                  <td className="p-3">{money(m.operatingCosts + m.revenueTaxes)}</td>
                  <td
                    className={`p-3 font-semibold ${m.ebitda < 0 ? "text-red-700" : "text-teal-700"}`}
                  >
                    {money(m.ebitda)}
                  </td>
                  <td className="p-3">{money(m.investment)}</td>
                  <td className={`p-3 ${m.balance < 0 ? "text-red-700" : ""}`}>
                    {money(m.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Caixa negativo indica necessidade de recursos no cenário. Promoção, inflação,
          inadimplência e atrasos de recebimento não estão incluídos. Confirmar tributos e custos
          reais com a contabilidade.
        </p>
      </section>
    </div>
  );
}
