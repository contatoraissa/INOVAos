import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  CircleDot,
  ClipboardCheck,
  Dna,
  FileText,
  Layers,
  Maximize,
  Printer,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { patientHistoryById } from "@/data/demo";
import { medicalPricing } from "@/data/pricing";
import { InvestorFinancialPlan } from "./InvestorFinancialPlan";

const chapters = [
  "Visão executiva",
  "Jornada do cuidado",
  "Produto em ação",
  "Modelo de negócio",
  "Planejamento financeiro",
  "Próximos marcos",
] as const;
const markers = [
  { key: "glicemia", name: "Glicemia", unit: "mg/dL" },
  { key: "ldl", name: "Colesterol LDL", unit: "mg/dL" },
  { key: "hemoglobina", name: "Hemoglobina", unit: "g/dL" },
  { key: "vitaminaD", name: "Vitamina D", unit: "ng/mL" },
] as const;
const history = patientHistoryById["mariana-oliveira"]?.history ?? [];
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_3px_20px_-16px_#0f172a] ${className}`}
    >
      {children}
    </section>
  );
}
function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700">
      {children}
    </p>
  );
}

export function InvestorPresentation() {
  const [chapter, setChapter] = useState(0);
  const [markerIndex, setMarkerIndex] = useState(0);
  const [subscribers, setSubscribers] = useState(100);
  const [ticket, setTicket] = useState(
    Number(medicalPricing.regularMonthly.replace(/[^\d,]/g, "").replace(",", ".")),
  );
  const [printAll, setPrintAll] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const marker = markers[markerIndex] ?? markers[0];
  const mrr = subscribers * ticket;
  const show = (index: number) => chapter === index || printAll;
  const scenario = [25, 50, 100, 250, 500].map((count) => ({
    name: String(count),
    revenue: count * ticket,
  }));
  const title = chapters[chapter];
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFullscreenError("");
    } catch {
      setFullscreenError("Use F11 para apresentar em tela cheia neste navegador.");
    }
  }
  function print() {
    setPrintAll(true);
    window.setTimeout(() => {
      window.print();
      setPrintAll(false);
    }, 300);
  }
  return (
    <div className="investor-view min-h-screen bg-[#f1f5f8] text-[#172c40]">
      <style>{`@media print { @page { size: 16in 12in; margin: 0.3in; } .investor-view { background: white!important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .investor-view .investor-controls { display:none!important; } .investor-view .investor-chapter { zoom: .7; break-before:page; break-inside:avoid; } .investor-view .investor-chapter:first-of-type { break-before:auto; } .investor-view main { padding:0!important; } .investor-view .recharts-responsive-container { min-height:230px; } }`}</style>
      <header className="border-b border-white/10 bg-[#102b3d] text-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-5 lg:px-10">
          <div className="flex items-center gap-5">
            <Link
              to="/"
              className="font-display text-2xl tracking-[0.2em] text-white"
              aria-label="INOVA · início"
            >
              IN<span className="text-cyan-300">∞</span>VA
            </Link>
            <span className="hidden h-7 w-px bg-white/20 sm:block" />
            <div className="hidden sm:block">
              <p className="text-sm font-medium">Visão para investidores</p>
              <p className="mt-1 text-[11px] text-slate-300">
                Produto, proposta de valor e plano de evolução · Outubro 2026
              </p>
            </div>
          </div>
          <div className="investor-controls flex items-center gap-2">
            <button
              onClick={() => setPrintAll((value) => !value)}
              className="rounded-lg border border-white/20 px-3 py-2.5 text-xs hover:bg-white/10"
            >
              {printAll ? "Por capítulos" : "Visão completa"}
            </button>
            <button
              onClick={fullscreen}
              className="rounded-lg border border-white/20 p-2.5 hover:bg-white/10"
              aria-label="Tela cheia"
            >
              <Maximize className="size-4" />
            </button>
            <button
              onClick={print}
              className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2.5 text-xs hover:bg-white/10"
            >
              <Printer className="size-4" />
              Salvar como PDF
            </button>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2.5 text-xs font-semibold text-[#102b3d]"
            >
              Explorar produto <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>
      <nav
        aria-label="Capítulos da apresentação"
        className="investor-controls border-b border-slate-200 bg-white"
      >
        <div className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-6 lg:px-10">
          {chapters.map((item, i) => (
            <button
              key={item}
              onClick={() => setChapter(i)}
              aria-current={chapter === i ? "page" : undefined}
              className={`shrink-0 border-b-2 px-4 py-4 text-sm ${chapter === i ? "border-teal-600 font-semibold text-teal-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}
            >
              <span className="mr-2 text-[10px] opacity-60">0{i + 1}</span>
              {item}
            </button>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-[1440px] space-y-6 px-6 py-8 lg:px-10">
        {fullscreenError && (
          <p role="status" className="text-sm">
            {fullscreenError}
          </p>
        )}
        {show(0) && (
          <div className="investor-chapter space-y-6">
            <section className="relative overflow-hidden rounded-3xl bg-[#102b3d] p-7 text-white lg:p-10">
              <div className="absolute -right-12 -top-32 size-96 rounded-full border-[50px] border-cyan-200/5" />
              <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    INOVA · INTELIGÊNCIA NO ACOMPANHAMENTO
                  </p>
                  <h1 className="mt-5 max-w-2xl font-display text-3xl font-semibold leading-tight lg:text-5xl">
                    Uma história de saúde.
                    <br />
                    <span className="text-cyan-200">Uma visão mais clara.</span>
                  </h1>
                  <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300">
                    Resultados, laudos e contexto do paciente organizados em uma jornada
                    compartilhada com o médico — antes, durante e depois da consulta.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-xs text-cyan-100">
                    <CircleDot className="size-3" />
                    Produto em demonstração · preparação para validação
                  </span>
                </div>
                <div className="flex flex-col justify-center gap-3">
                  {[
                    {
                      icon: AudioLines,
                      title: "A voz do paciente",
                      detail: "Texto, áudio e laudos antes da consulta.",
                    },
                    {
                      icon: Activity,
                      title: "A visão do médico",
                      detail: "Resultados, evolução e contexto reunidos.",
                    },
                    {
                      icon: ClipboardCheck,
                      title: "Continuidade do cuidado",
                      detail: "Pedidos e orientações voltam ao paciente.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <item.icon className="size-6 shrink-0 text-cyan-300" />
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-300">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  value: "2",
                  label: "Experiências conectadas",
                  detail: "Paciente e médico",
                  icon: Users,
                },
                {
                  value: "4",
                  label: "Domínios genéticos",
                  detail: "Categorias; escores ainda pendentes",
                  icon: Dna,
                },
                {
                  value: "6",
                  label: "Coletas no exemplo",
                  detail: "Histórico fictício de Mariana",
                  icon: Activity,
                },
                {
                  value: "Texto + áudio",
                  label: "Preparação da consulta",
                  detail: "Paciente participa antes de chegar",
                  icon: AudioLines,
                },
              ].map((item) => (
                <Card key={item.label}>
                  <div className="flex justify-between gap-3">
                    <Label>{item.label}</Label>
                    <item.icon className="size-5 text-teal-600" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold">{item.value}</p>
                  <p className="mt-2 text-xs text-slate-500">{item.detail}</p>
                </Card>
              ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <Card>
                <Label>O problema que buscamos resolver</Label>
                <h2 className="mt-3 text-xl font-semibold">
                  Informação dispersa, contexto perdido.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Laudos isolados e relatos que chegam só na consulta dificultam enxergar a história
                  completa. A proposta é organizar essa informação para o acompanhamento.
                </p>
              </Card>
              <Card>
                <Label>A proposta de valor</Label>
                <h2 className="mt-3 text-xl font-semibold">Preparar. Entender. Acompanhar.</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Dar ao paciente um lugar claro para participar e ao médico uma visão organizada
                  dos dados, com revisão humana e evolução ao longo do tempo.
                </p>
              </Card>
              <Card>
                <Label>O próximo objetivo</Label>
                <h2 className="mt-3 text-xl font-semibold">Validar em um piloto controlado.</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Conectar os fluxos reais mantendo o produto aprovado, testar a jornada completa e
                  medir adesão, uso e valor percebido.
                </p>
              </Card>
            </div>
          </div>
        )}
        {show(1) && (
          <div className="investor-chapter space-y-6">
            <div>
              <Label>02 · Jornada do cuidado</Label>
              <h1 className="mt-3 text-3xl font-semibold">A consulta começa antes do encontro.</h1>
              <p className="mt-3 text-sm text-slate-500">
                Uma jornada contínua, com participação do paciente e decisão do profissional.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-4">
              {[
                {
                  title: "Paciente prepara",
                  icon: AudioLines,
                  items: ["Sintomas e mudanças", "Medicamentos e perguntas", "Áudios e anexos"],
                },
                {
                  title: "Médico consulta",
                  icon: FileText,
                  items: ["Relatos recebidos", "Laudos e histórico", "Gráficos por marcador"],
                },
                {
                  title: "Profissional revisa",
                  icon: ShieldCheck,
                  items: [
                    "Confere o documento original",
                    "Revisa informações da IA",
                    "Define a orientação",
                  ],
                },
                {
                  title: "Cuidado continua",
                  icon: ClipboardCheck,
                  items: ["Pedidos de exames", "Orientações publicadas", "Retorno e evolução"],
                },
              ].map((step, i) => (
                <Card key={step.title}>
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-teal-50 p-3 text-teal-700">
                      <step.icon className="size-6" />
                    </span>
                    <span className="text-3xl font-light text-slate-200">0{i + 1}</span>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold">{step.title}</h2>
                  <ul className="mt-5 space-y-3">
                    {step.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-slate-500">
                        <Check className="size-3 text-teal-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            <Card className="grid gap-6 lg:grid-cols-2">
              <div>
                <Label>O que diferencia a proposta</Label>
                <h2 className="mt-3 text-2xl font-semibold">Contexto humano junto aos dados.</h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-500">
                  O exame ganha uma linha do tempo. O relato ganha um lugar na preparação. A
                  orientação volta para um espaço acessível ao paciente.
                </p>
              </div>
              <div className="rounded-xl bg-teal-50 p-5">
                <p className="text-sm font-semibold text-teal-800">O que medir no piloto</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    "Preparações enviadas / consultas",
                    "Revisões realizadas pelo médico",
                    "Uso recorrente por profissional",
                    "Clareza percebida pelo paciente",
                  ].map((label) => (
                    <p key={label} className="rounded-lg bg-white p-3 text-xs text-slate-600">
                      {label}
                    </p>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Indicadores propostos. Ainda não representam métricas coletadas.
                </p>
              </div>
            </Card>
          </div>
        )}
        {show(2) && (
          <div className="investor-chapter space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Label>03 · Produto em ação</Label>
                <h1 className="mt-3 text-3xl font-semibold">Da coleta isolada à evolução.</h1>
                <p className="mt-3 text-sm text-slate-500">
                  Mariana Oliveira · exemplo fictício extraído da demonstração do sistema.
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Sem validade clínica
              </span>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <Label>Histórico laboratorial demonstrativo</Label>
                    <h2 className="mt-2 text-xl font-semibold">{marker.name}</h2>
                  </div>
                  <select
                    aria-label="Marcador demonstrativo"
                    value={markerIndex}
                    onChange={(e) => setMarkerIndex(Number(e.target.value))}
                    className="investor-controls rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  >
                    {markers.map((m, i) => (
                      <option key={m.key} value={i}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-5 text-4xl font-semibold">
                  {history.at(-1)?.[marker.key]?.toLocaleString("pt-BR")}{" "}
                  <span className="text-sm font-normal text-slate-500">{marker.unit}</span>
                </p>
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ left: 0, right: 15, top: 15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#dce5eb" />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip formatter={(value) => [`${value} ${marker.unit}`, marker.name]} />
                      <Line
                        type="monotone"
                        dataKey={marker.key}
                        stroke="#0891a0"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#0891a0" }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Variações numéricas do exemplo; não demonstram eficácia clínica ou melhora de
                  saúde causada pelo sistema.
                </p>
              </Card>
              <div className="space-y-5">
                <Card>
                  <Label>Espaço do paciente</Label>
                  <h2 className="mt-3 text-xl font-semibold">Minha saúde</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Panorama, resultados, preparação, documentos e orientações em um menu
                    organizado.
                  </p>
                  <Link
                    to="/acesso-paciente"
                    className="investor-controls mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
                  >
                    Abrir demonstração do paciente <ArrowRight className="size-4" />
                  </Link>
                </Card>
                <Card>
                  <Label>Espaço do médico</Label>
                  <h2 className="mt-3 text-xl font-semibold">Contexto para acompanhar</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Envios do paciente, resumo, laudos, gráficos, genética e genômica no
                    acompanhamento.
                  </p>
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: "mariana-oliveira" }}
                    className="investor-controls mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
                  >
                    Abrir prontuário demonstrativo <ArrowRight className="size-4" />
                  </Link>
                </Card>
              </div>
            </div>
            <Card>
              <Label>Genética e genômica</Label>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {["Neurologia", "Metabólico", "Imunidade", "Nutrição"].map((domain) => (
                  <div key={domain} className="rounded-xl border border-slate-200 p-4">
                    <Dna className="size-5 text-teal-600" />
                    <h3 className="mt-3 text-sm font-semibold">{domain}</h3>
                    <p className="mt-2 text-xs text-slate-500">Organização do acompanhamento</p>
                    <p className="mt-3 text-xs font-medium text-amber-700">
                      Escores pendentes de validação
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
        {show(3) && (
          <div className="investor-chapter space-y-6">
            <div>
              <Label>04 · Modelo de negócio</Label>
              <h1 className="mt-3 text-3xl font-semibold">
                Assinatura médica. Participação do paciente.
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                Modelo proposto no produto. Cobrança e contratação ainda precisam ser
                operacionalizadas.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <Card>
                <Label>Oferta apresentada no sistema</Label>
                <p className="mt-4 text-4xl font-semibold">
                  {medicalPricing.regularMonthly}
                  <span className="text-sm font-normal text-slate-500"> / mês</span>
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Entrada: {medicalPricing.introductoryMonthly}/mês por{" "}
                  {medicalPricing.introductoryMonths} meses.
                </p>
                <p className="mt-5 rounded-xl bg-teal-50 p-4 text-sm text-teal-800">
                  Conta gratuita do paciente como parte da jornada de acompanhamento.
                </p>
              </Card>
              <Card className="lg:col-span-2">
                <Label>Simulador de receita recorrente · hipóteses editáveis</Label>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Médicos assinantes: {subscribers}
                    <input
                      aria-label="Médicos assinantes simulados"
                      className="mt-4 block w-full accent-teal-600"
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={subscribers}
                      onChange={(e) => setSubscribers(Number(e.target.value))}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Ticket mensal hipotético (R$)
                    <input
                      aria-label="Ticket mensal hipotético"
                      className="mt-2 block w-full rounded-lg border border-slate-200 p-2"
                      type="number"
                      min="0"
                      max="10000"
                      step="0.1"
                      value={ticket}
                      onChange={(e) =>
                        setTicket(Math.max(0, Math.min(10000, Number(e.target.value))))
                      }
                    />
                  </label>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#102b3d] p-5 text-white">
                    <p className="text-xs text-cyan-200">Receita mensal simulada (MRR)</p>
                    <p className="mt-3 text-3xl font-semibold">{money(mrr)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-5">
                    <p className="text-xs text-slate-500">Receita anualizada simulada</p>
                    <p className="mt-3 text-3xl font-semibold">{money(mrr * 12)}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Assinantes × ticket. Não é receita atual nem previsão. Não inclui promoção,
                  inadimplência, cancelamentos, impostos ou custos; receita anualizada não equivale
                  à receita realizada.
                </p>
              </Card>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <Card>
                <h2 className="text-lg font-semibold">Sensibilidade ao número de assinantes</h2>
                <p className="mt-2 text-xs text-slate-500">
                  Cenários ilustrativos ao ticket selecionado · receita mensal em reais
                </p>
                <div className="mt-5 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scenario}>
                      <CartesianGrid strokeDasharray="3 5" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        tickFormatter={(v) => `${Number(v) / 1000} mil`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip formatter={(value) => [money(Number(value)), "Receita simulada"]} />
                      <Bar
                        dataKey="revenue"
                        fill="#0891a0"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Eixo horizontal: médicos assinantes simulados.
                </p>
              </Card>
              <Card>
                <Label>Métricas para validar antes de escalar</Label>
                <ul className="mt-5 space-y-5">
                  {[
                    "Conversão de demonstração em piloto",
                    "Ativação e retenção dos profissionais",
                    "Disposição a pagar e ticket efetivo",
                    "Custos de IA, operação e atendimento",
                    "Aquisição de clientes e margem",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-slate-600">
                      <TrendingUp className="size-4 shrink-0 text-teal-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}
        <div className="investor-chapter" style={{ display: show(4) ? undefined : "none" }}>
          <InvestorFinancialPlan subscribers={subscribers} ticket={ticket} />
        </div>
        {show(5) && (
          <div className="investor-chapter space-y-6">
            <div>
              <Label>06 · Próximos marcos</Label>
              <h1 className="mt-3 text-3xl font-semibold">
                Evoluir a base aprovada, validar e então escalar.
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                Sequência proposta de desenvolvimento. Prazos e orçamento ainda não definidos.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  label: "Hoje",
                  title: "Demonstração navegável",
                  status: "Disponível para apresentação",
                  items: [
                    "Interfaces paciente e médico",
                    "Resultados e gráficos demonstrativos",
                    "Preparação com texto, áudio e anexos",
                    "Módulos de genética bruta",
                  ],
                },
                {
                  label: "Próximo marco",
                  title: "Fluxos reais completos",
                  status: "Desenvolvimento e validação",
                  items: [
                    "Preservar o layout aprovado",
                    "Reconectar dados e contas reais",
                    "Testar permissões e persistência",
                    "Testar jornada paciente → médico",
                  ],
                },
                {
                  label: "Após validação",
                  title: "Piloto e operação",
                  status: "Planejado",
                  items: [
                    "Definir grupo e critérios do piloto",
                    "Medir adesão e valor percebido",
                    "Operacionalizar cobrança e suporte",
                    "Validar integrações e custo de uso",
                  ],
                },
              ].map((phase, i) => (
                <Card key={phase.title}>
                  <Label>{phase.label}</Label>
                  <h2 className="mt-3 text-xl font-semibold">{phase.title}</h2>
                  <p
                    className={`mt-3 inline-block rounded-full px-3 py-1 text-[11px] ${i === 0 ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-800"}`}
                  >
                    {phase.status}
                  </p>
                  <ul className="mt-6 space-y-4">
                    {phase.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-slate-500">
                        <Layers className="size-4 shrink-0 text-teal-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            <Card className="grid gap-6 lg:grid-cols-2">
              <div>
                <Label>Conversas com investidores</Label>
                <h2 className="mt-3 text-2xl font-semibold">
                  Capital para transformar demonstração em operação validada.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-500">
                  Frentes propostas: engenharia dos fluxos reais, qualidade e controle de acesso,
                  execução do piloto e preparação comercial. Valor de captação e condições ainda
                  serão definidos.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-5">
                <h3 className="text-sm font-semibold">Limites do estágio atual</h3>
                <ul className="mt-4 space-y-3 text-xs leading-relaxed text-slate-500">
                  <li>
                    Não há métricas de tração, receita ou resultado clínico comprovadas nesta
                    apresentação.
                  </li>
                  <li>
                    As interfaces reais anteriores foram removidas; backend e contas foram
                    preservados para evolução.
                  </li>
                  <li>
                    S2 Labs não possui integração real de preços ou agendamento; escores genéticos
                    seguem pendentes.
                  </li>
                  <li>IA auxilia a organização; não substitui decisão e revisão profissional.</li>
                </ul>
              </div>
            </Card>
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5 text-[11px] text-slate-500">
          <p>
            INOVA · Apresentação do produto · Dados clínicos demonstrativos e cenários comerciais
            hipotéticos.
          </p>
          <span>{printAll ? "Visão completa" : `0${chapter + 1} / 06 · ${title}`}</span>
        </footer>
        <div className="investor-controls flex items-center justify-between">
          <button
            disabled={chapter === 0}
            onClick={() => setChapter((c) => c - 1)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-30"
          >
            Anterior
          </button>
          <button
            disabled={chapter === 5}
            onClick={() => setChapter((c) => c + 1)}
            className="flex items-center gap-2 rounded-lg bg-[#102b3d] px-4 py-2 text-sm text-white disabled:opacity-30"
          >
            Próximo capítulo <ArrowRight className="size-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
