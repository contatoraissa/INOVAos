import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/inova/AppShell";
import { HistoryPage } from "@/components/inova/SecondaryPages";
export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Histórico de exames — INOVA" },
      { name: "description", content: "Acesse a linha do tempo laboratorial dos pacientes." },
      { property: "og:title", content: "Histórico de exames — INOVA" },
      { property: "og:description", content: "Evolução temporal dos resultados laboratoriais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <HistoryPage />
    </AppShell>
  ),
});
