import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PatientCareData } from "./usePatientCare";
import type { CareDestination } from "@/lib/care-contract";
import { patientHistoryById } from "@/data/demo";

export function PatientAccessibility() {
  const [large, setLarge] = useState(false);
  const [contrast, setContrast] = useState(false);
  useEffect(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem("inova-patient-accessibility") ?? "{}");
      setLarge(preferences.large === true);
      setContrast(preferences.contrast === true);
    } catch {
      /* Default preferences */
    }
  }, []);
  useEffect(() => {
    const portal = document.querySelector(".patient-portal");
    portal?.classList.toggle("patient-large-text", large);
    portal?.classList.toggle("patient-high-contrast", contrast);
  }, [large, contrast]);
  function change(nextLarge: boolean, nextContrast: boolean) {
    setLarge(nextLarge);
    setContrast(nextContrast);
    try {
      localStorage.setItem(
        "inova-patient-accessibility",
        JSON.stringify({ large: nextLarge, contrast: nextContrast }),
      );
    } catch {
      /* Preferences still apply to this session. */
    }
  }
  return (
    <details className="rounded-xl border border-border bg-white p-3 print:hidden">
      <summary className="cursor-pointer text-sm font-semibold text-brand-deep">
        Acessibilidade
      </summary>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={large}
            onChange={(event) => change(event.target.checked, contrast)}
          />
          Letras maiores
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={contrast}
            onChange={(event) => change(large, event.target.checked)}
          />
          Mais contraste
        </label>
        <Button size="sm" variant="outline" onClick={() => change(false, false)}>
          Restaurar padrão
        </Button>
      </div>
    </details>
  );
}

export function PatientSearch({
  data,
  documents,
  onOpen,
}: {
  data: PatientCareData | null;
  documents: { name: string; kind: string }[];
  onOpen: (destination: CareDestination | "results") => void;
}) {
  const [query, setQuery] = useState("");
  const rows: { title: string; detail: string; destination: CareDestination | "results" }[] = [
    ...documents.map((item) => ({
      title: item.name,
      detail: `Documento local · ${item.kind}`,
      destination: "documents" as const,
    })),
    ...(data?.orders
      .filter((item) => item.status !== "draft")
      .map((item) => ({
        title: item.exams.map((exam) => exam.name).join(", "),
        detail: `Pedido de exames · ${item.status === "cancelled" ? "Cancelado" : "Liberado"} · ${new Date(item.createdAt).toLocaleDateString("pt-BR")}`,
        destination: "orders" as const,
      })) ?? []),
    ...(data?.guidance.map((item) => ({
      title: item.title,
      detail: `${item.category} · ${item.text}`,
      destination:
        item.category === "Preparo dos exames" ? ("preparation" as const) : ("guidance" as const),
    })) ?? []),
    ...(data?.submissions.map((item) => ({
      title: "Envio ao médico",
      detail: `${new Date(item.receivedAt).toLocaleDateString("pt-BR")} · ${item.documents.map((document) => document.name).join(", ")}`,
      destination: "consultation" as const,
    })) ?? []),
    ...(patientHistoryById["mariana-oliveira"]?.history.flatMap((item) =>
      ["Hemoglobina", "Glicemia", "Colesterol LDL", "Vitamina D"].map((name) => ({
        title: name,
        detail: `Resultado fictício · ${item.period}`,
        destination: "results" as const,
      })),
    ) ?? []),
  ];
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const found = query.trim()
    ? rows.filter((item) =>
        normalize(item.title + " " + item.detail).includes(normalize(query.trim())),
      )
    : [];
  return (
    <section className="surface p-4 print:hidden" aria-label="Busca no espaço do paciente">
      <label htmlFor="patient-unified-search" className="text-sm font-semibold">
        Encontrar no meu espaço
      </label>
      <Input
        id="patient-unified-search"
        className="mt-2"
        placeholder="Busque exame, pedido, documento ou orientação…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query.trim() && (
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          <p role="status" className="text-xs text-muted-foreground">
            {found.length} resultado(s). Abra a seção para consultar os detalhes.
          </p>
          {found.slice(0, 25).map((item, index) => (
            <button
              key={index}
              className="block w-full rounded-lg border border-border p-3 text-left hover:bg-brand-soft"
              onClick={() => {
                onOpen(item.destination);
                setQuery("");
              }}
            >
              <span className="block text-sm font-semibold">{item.title}</span>
              <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                {item.detail}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
