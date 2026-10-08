import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/inova/AppShell";
import { DoctorReportsPage } from "@/components/inova/DoctorReportsPage";
export const Route = createFileRoute("/indicators")({
  head: () => ({
    meta: [
      { title: "Meus relatórios — INOVA" },
      { name: "description", content: "Relatórios da carteira demonstrativa do médico." },
      { property: "og:title", content: "Meus relatórios — INOVA" },
      { property: "og:description", content: "Atividade e pendências do médico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <DoctorReportsPage />
    </AppShell>
  ),
});
