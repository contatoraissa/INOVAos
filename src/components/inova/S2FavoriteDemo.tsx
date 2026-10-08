import { useState } from "react";
import { MapPin, Search, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addFavoriteLab } from "@/lib/care";

const laboratories = [
  {
    name: "Unidade Centro · exemplo S2",
    address: "Unidade fictícia · região central de Sorocaba/SP",
    cep: "18035000",
    price: "R$ 89,90",
    collection: "Coleta na unidade",
  },
  {
    name: "Unidade Zona Norte · exemplo S2",
    address: "Unidade fictícia · zona norte de Sorocaba/SP",
    cep: "18075000",
    price: "R$ 104,90",
    collection: "Coleta na unidade",
  },
  {
    name: "Coleta domiciliar · exemplo S2",
    address: "Serviço fictício · Sorocaba/SP",
    cep: "18035000",
    price: "R$ 139,90",
    collection: "Coleta domiciliar",
  },
];
export function S2FavoriteDemo({
  favoriteNames,
  onSaved,
  onOrders,
}: {
  favoriteNames: string[];
  onSaved: () => Promise<void>;
  onOrders: () => void;
}) {
  const [cep, setCep] = useState("18035-000");
  const [searched, setSearched] = useState(false);
  const [home, setHome] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [area, setArea] = useState("");
  async function save(lab: (typeof laboratories)[number]) {
    setBusy(lab.name);
    setMessage("");
    try {
      await addFavoriteLab({
        data: {
          patientId: "mariana-oliveira",
          name: lab.name,
          address: lab.address,
          cep: lab.cep,
          website: "",
        },
      });
      await onSaved();
      setMessage("Unidade demonstrativa adicionada aos seus favoritos.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível salvar o favorito.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="space-y-5" aria-label="Consulta demonstrativa S2 Labs">
      <div className="rounded-2xl border border-brand/20 bg-brand-soft p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">INOVA + S2 LABS</p>
          <span className="rounded-full border border-brand/20 bg-white px-3 py-1 text-xs font-medium text-brand-deep">
            Ambiente demonstrativo configurado
          </span>
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold">
          Escolha onde realizar seus exames
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Simule a consulta de opções, compare uma cotação ilustrativa e guarde sua preferência.
          Unidades e valores abaixo são fictícios; a conexão real com a S2 Labs ainda não está
          ativa.
        </p>
        <form
          className="mt-5 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setArea(cep);
            setSearched(true);
            setMessage("");
          }}
        >
          <div className="min-w-48 flex-1">
            <label htmlFor="s2-demo-cep" className="label">
              Seu CEP
            </label>
            <Input
              id="s2-demo-cep"
              value={cep}
              onChange={(event) => {
                setCep(event.target.value);
                setSearched(false);
              }}
              required
              pattern="[0-9]{5}-?[0-9]{3}"
              inputMode="numeric"
              maxLength={9}
              placeholder="00000-000"
            />
          </div>
          <Button>
            <Search className="size-4" />
            Consultar opções
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Pacote de exemplo: hemograma completo, glicemia em jejum e perfil lipídico. Nenhum pedido
          é enviado ao laboratório.
        </p>
      </div>
      {searched && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">
              Opções fictícias para simular o fluxo · CEP informado: {area}
            </p>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={home}
                onChange={(event) => setHome(event.target.checked)}
              />
              Somente coleta domiciliar
            </label>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {laboratories
              .filter((lab) => !home || lab.collection === "Coleta domiciliar")
              .map((lab) => {
                const saved = favoriteNames.includes(lab.name);
                return (
                  <article key={lab.name} className="surface flex flex-col p-5">
                    <span className="inline-flex items-center gap-2 text-xs text-brand-deep">
                      <MapPin className="size-4" />
                      Unidade demonstrativa
                    </span>
                    <h3 className="mt-3 text-lg font-semibold">{lab.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{lab.address}</p>
                    <p className="mt-3 text-xs">{lab.collection}</p>
                    <div className="my-5 border-y py-4">
                      <p className="text-xs text-muted-foreground">Valor fictício do pacote</p>
                      <p className="mt-1 text-2xl font-semibold">{lab.price}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Sem validade comercial ou disponibilidade verificada.
                      </p>
                    </div>
                    <Button
                      variant={saved ? "outline" : "default"}
                      disabled={saved || busy !== null}
                      className="mt-auto"
                      onClick={() => {
                        void save(lab);
                      }}
                    >
                      <Heart className="size-4" />
                      {saved
                        ? "Nos meus favoritos"
                        : busy === lab.name
                          ? "Salvando…"
                          : "Salvar nos favoritos"}
                    </Button>
                  </article>
                );
              })}
          </div>
        </>
      )}
      {message && (
        <p role="status" className="rounded-xl border bg-white p-4 text-sm">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onOrders}>
          Ver meus exames solicitados <ArrowRight className="size-4" />
        </Button>
        <a
          href="https://www.s2medica.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 text-sm font-medium text-brand-deep underline"
        >
          Consultar o site oficial da S2
        </a>
      </div>
    </section>
  );
}
