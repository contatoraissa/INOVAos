import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/inova/AppShell";
import { DoctorProfilePage } from "@/components/inova/DoctorProfilePage";
export const Route = createFileRoute("/doctors")({
  head: () => ({
    meta: [
      { title: "Meu perfil profissional — INOVA" },
      {
        name: "description",
        content: "Dados profissionais e consultório do perfil demonstrativo.",
      },
      { property: "og:title", content: "Meu perfil profissional — INOVA" },
      { property: "og:description", content: "Perfil profissional do médico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <DoctorProfilePage />
    </AppShell>
  ),
});
