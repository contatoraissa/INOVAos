import { useState } from "react";
import {
  ShoppingCart,
  Search,
  MapPin,
  Check,
  FlaskConical,
  Building2,
  Home,
  ArrowLeft,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { getS2Quote } from "@/lib/exam-orders";

type Laboratory = Awaited<ReturnType<typeof getS2Quote>>["prices"][number];
const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function S2QuoteExplorer({ prices, cep }: { prices: Laboratory[]; cep: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"exams" | "labs" | "review">("exams");
  const [cart, setCart] = useState<string[]>(prices[0]?.items.map((item) => item.id) ?? []);
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState(50);
  const [service, setService] = useState<"unit" | "home">("unit");
  const [chosen, setChosen] = useState<Laboratory | null>(null);
  const [completed, setCompleted] = useState(false);
  const exams = prices[0]?.items ?? [];
  const filtered = exams.filter((item) =>
    item.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(
        search
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase(),
      ),
  );
  const labs = prices.filter(
    (lab) =>
      lab.distanceKm <= radius &&
      (service === "home"
        ? lab.collection === "Coleta domiciliar"
        : lab.collection !== "Coleta domiciliar"),
  );
  const total = (lab: Laboratory) =>
    lab.items
      .filter((item) => cart.includes(item.id))
      .reduce((sum, item) => sum + item.cents, lab.feeCents);
  const toggle = (id: string) => {
    setCart((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    setChosen(null);
    setCompleted(false);
  };
  return (
    <>
      <Button
        className="mt-4"
        onClick={() => {
          setOpen(true);
          setStep("exams");
          setCompleted(false);
        }}
      >
        <ShoppingCart className="size-4" /> Explorar exames e laboratórios
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-6xl gap-0 overflow-y-auto p-0 sm:max-w-6xl">
          <DialogHeader className="border-b border-border px-6 py-5 pr-12">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-lg font-semibold text-brand-deep">
                INOVA <span className="font-normal text-muted-foreground">· jornada S2 Labs</span>
              </p>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                Demonstração para investidores
              </span>
            </div>
            <DialogTitle className="mt-2 text-2xl">
              {step === "exams"
                ? "Seus exames, em um só lugar"
                : step === "labs"
                  ? "Escolha onde realizar seus exames"
                  : "Confira sua escolha"}
            </DialogTitle>
            <DialogDescription>
              Laboratórios, preços e distâncias fictícios. Sem conexão com a API real da S2, reserva
              ou pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-brand-soft/40 p-5 sm:p-7">
            <ol className="mb-6 flex flex-wrap gap-3 text-xs sm:text-sm">
              {[
                ["exams", "Selecionar exames"],
                ["labs", "Comparar laboratórios"],
                ["review", "Revisar escolha"],
              ].map(([id, label], i) => (
                <li
                  key={id}
                  className={`flex items-center gap-2 ${step === id ? "font-semibold text-brand-deep" : "text-muted-foreground"}`}
                >
                  <span
                    className={`flex size-6 items-center justify-center rounded-full ${step === id ? "bg-brand text-white" : "bg-background"}`}
                  >
                    {i + 1}
                  </span>
                  {label}
                  {i < 2 && <ArrowRight className="ml-1 size-3" />}
                </li>
              ))}
            </ol>
            <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_300px]">
              <div className="min-w-0 space-y-4">
                {step === "exams" && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-3.5 size-5 text-brand-deep" />
                      <Input
                        aria-label="Pesquisar exames do pedido"
                        className="h-12 rounded-full bg-background pl-12"
                        placeholder="Pesquise os exames da sua guia"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {filtered.length} exame(s) no pedido · seleção apenas para comparar preços; a
                      guia médica permanece completa.
                    </p>
                    {filtered.map((exam) => {
                      const added = cart.includes(exam.id);
                      return (
                        <article
                          key={exam.id}
                          className={`rounded-2xl border bg-background p-5 ${added ? "border-brand/60" : "border-border"}`}
                        >
                          <div className="flex items-center gap-2">
                            <FlaskConical className="size-5 text-brand" />
                            <h3 className="font-semibold">{exam.name}</h3>
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">
                            Exame solicitado pelo Dr. Rafael Mendes. Compare as opções de
                            atendimento para este item da sua guia.
                          </p>
                          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                A partir de · valor fictício
                              </p>
                              <p className="mt-1 text-xl font-semibold">
                                {money(
                                  Math.min(
                                    ...prices.map(
                                      (lab) => lab.items.find((item) => item.id === exam.id)!.cents,
                                    ),
                                  ),
                                )}
                              </p>
                            </div>
                            <Button
                              variant={added ? "outline" : "default"}
                              className="rounded-full"
                              aria-label={`${added ? "Remover" : "Adicionar"} ${exam.name} ${added ? "do" : "ao"} carrinho`}
                              onClick={() => toggle(exam.id)}
                            >
                              {added ? (
                                <Trash2 className="size-4" />
                              ) : (
                                <ShoppingCart className="size-4" />
                              )}
                              {added ? "Remover do carrinho" : "Adicionar ao carrinho"}
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                    {!filtered.length && (
                      <p className="rounded-xl bg-background p-5 text-sm text-muted-foreground">
                        Nenhum exame do pedido corresponde à busca.
                      </p>
                    )}
                  </>
                )}
                {step === "labs" && (
                  <>
                    <div className="flex items-center gap-2 rounded-2xl bg-background p-4 text-sm">
                      <MapPin className="size-5 shrink-0 text-brand" />
                      <div>
                        CEP {cep.slice(0, 5)}-{cep.slice(5)}
                        <p className="text-xs text-muted-foreground">
                          Cenário ilustrativo de Sorocaba/SP; o CEP não realiza uma busca
                          geográfica.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-5">
                      <label
                        htmlFor="quote-radius"
                        className="flex justify-between text-sm font-medium"
                      >
                        Raio ilustrativo <span>{radius} km</span>
                      </label>
                      <input
                        id="quote-radius"
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="mt-4 w-full accent-brand"
                      />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant={service === "unit" ? "default" : "outline"}
                          onClick={() => setService("unit")}
                        >
                          <Building2 className="size-4" /> No laboratório
                        </Button>
                        <Button
                          variant={service === "home" ? "default" : "outline"}
                          onClick={() => setService("home")}
                        >
                          <Home className="size-4" /> À domicílio
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {labs.map((lab) => (
                        <article
                          key={lab.name}
                          className="flex flex-col rounded-2xl border border-border bg-background p-5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Building2 className="size-6 text-brand" />
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                              Cobre a seleção
                            </span>
                          </div>
                          <h3 className="mt-3 font-semibold">{lab.name}</h3>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            {lab.distanceKm} km · {lab.address}
                          </p>
                          <div className="my-4 space-y-2 border-y border-border py-3">
                            {lab.items
                              .filter((item) => cart.includes(item.id))
                              .map((item) => (
                                <div key={item.id} className="flex justify-between gap-3 text-xs">
                                  <span>{item.name}</span>
                                  <span className="shrink-0">{money(item.cents)}</span>
                                </div>
                              ))}
                            {lab.feeCents > 0 && (
                              <div className="flex justify-between text-xs">
                                <span>Taxa domiciliar fictícia</span>
                                <span>{money(lab.feeCents)}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            <span className="text-sm">Total · {cart.length} exame(s)</span>
                            <strong className="text-xl text-brand-deep">{money(total(lab))}</strong>
                          </div>
                          <Button
                            className="mt-4 rounded-full"
                            onClick={() => {
                              setChosen(lab);
                              setStep("review");
                              setCompleted(false);
                            }}
                          >
                            Escolher este laboratório <ArrowRight className="size-4" />
                          </Button>
                        </article>
                      ))}
                    </div>
                    {!labs.length && (
                      <p className="rounded-xl bg-background p-5 text-sm">
                        Nenhuma opção fictícia neste raio. Aumente a distância ou altere o
                        atendimento.
                      </p>
                    )}
                  </>
                )}
                {step === "review" && chosen && (
                  <article className="rounded-2xl border border-brand/30 bg-background p-6">
                    <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft">
                      <Check className="size-6 text-brand" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">
                      {completed ? "Escolha simulada concluída" : chosen.name}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {chosen.name} · {chosen.collection}
                    </p>
                    <div className="my-5 space-y-3">
                      {chosen.items
                        .filter((item) => cart.includes(item.id))
                        .map((item) => (
                          <div key={item.id} className="flex justify-between gap-3 text-sm">
                            <span>{item.name}</span>
                            <span className="shrink-0">{money(item.cents)}</span>
                          </div>
                        ))}
                      {chosen.feeCents > 0 && (
                        <p className="text-sm">Taxa domiciliar: {money(chosen.feeCents)}</p>
                      )}
                    </div>
                    <div className="flex justify-between border-t border-border pt-4">
                      <span>Total fictício</span>
                      <strong className="text-2xl text-brand-deep">{money(total(chosen))}</strong>
                    </div>
                    <p className="mt-5 text-sm text-muted-foreground">
                      Esta escolha é apenas uma demonstração. Nenhuma data foi reservada, cobrança
                      realizada ou informação enviada ao laboratório.
                    </p>
                    {!completed && (
                      <Button className="mt-5" onClick={() => setCompleted(true)}>
                        Concluir simulação <Check className="size-4" />
                      </Button>
                    )}
                    {completed && (
                      <p
                        role="status"
                        className="mt-5 rounded-xl bg-brand-soft p-4 text-sm text-brand-deep"
                      >
                        Para uma coleta real, consulte o laboratório e depois informe a data em
                        Minha agenda.
                      </p>
                    )}
                  </article>
                )}
                {step !== "exams" && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep(step === "review" ? "labs" : "exams");
                      setCompleted(false);
                    }}
                  >
                    <ArrowLeft className="size-4" />{" "}
                    {step === "review" ? "Voltar aos laboratórios" : "Adicionar ou remover exames"}
                  </Button>
                )}
              </div>
              <aside className="h-fit rounded-2xl border border-border bg-background p-5 lg:sticky lg:top-0">
                <h3 className="flex items-center gap-2 font-semibold">
                  <ShoppingCart className="size-5 text-brand" /> Seu carrinho ({cart.length})
                </h3>
                <div className="mt-4 space-y-3">
                  {exams
                    .filter((item) => cart.includes(item.id))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-xs"
                      >
                        <span>{item.name}</span>
                        <button
                          type="button"
                          aria-label={`Remover ${item.name} do carrinho`}
                          onClick={() => {
                            toggle(item.id);
                            setStep("exams");
                          }}
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                </div>
                {!cart.length && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Adicione um exame para comparar os laboratórios.
                  </p>
                )}
                <Button
                  className="mt-4 w-full rounded-full"
                  disabled={!cart.length || step !== "exams"}
                  onClick={() => setStep("labs")}
                >
                  <ShoppingCart className="size-4" /> Comparar laboratórios
                </Button>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Comparação fictícia dos itens selecionados. Nenhum exame foi removido do pedido do
                  médico.
                </p>
              </aside>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
