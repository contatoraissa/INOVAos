import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/inova/AppShell";
import { DoctorSettingsPage } from "@/components/inova/DoctorSettingsPage";
export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — INOVA" },
      { name: "description", content: "Preferências demonstrativas da plataforma INOVA." },
      { property: "og:title", content: "Configurações — INOVA" },
      { property: "og:description", content: "Preferências do ambiente médico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <DoctorSettingsPage />
    </AppShell>
  ),
});
