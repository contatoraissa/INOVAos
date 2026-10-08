import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/inova/AppShell";
import { Page } from "@/components/inova/Page";
import { AnnualAgenda } from "@/components/inova/AnnualAgenda";
export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — INOVA" }] }),
  component: () => (
    <AppShell>
      <Page
        title="Agenda"
        description="Seu calendário de consultas, exames e retornos. Navegue pelos meses e acompanhe cada dia."
      >
        <AnnualAgenda audience="doctor" />
      </Page>
    </AppShell>
  ),
});
