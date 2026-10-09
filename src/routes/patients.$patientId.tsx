import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/inova/AppShell";
import { PatientDetailPage } from "@/components/inova/PatientDetailPage";
export const Route = createFileRoute("/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Visão completa do paciente — INOVA" },
      {
        name: "description",
        content: "Resultados, histórico, evolução e comparação laboratorial.",
      },
      { property: "og:title", content: "Visão completa do paciente — INOVA" },
      { property: "og:description", content: "Histórico e evolução laboratorial organizados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientRoute,
});
function PatientRoute() {
  const { patientId } = Route.useParams();
  return <PatientDetailPage patientId={patientId} />;
}
