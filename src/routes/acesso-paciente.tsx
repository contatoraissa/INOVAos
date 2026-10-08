import { createFileRoute } from "@tanstack/react-router";
import { PatientLoginPage } from "../components/inova/PatientLoginPage";
export const Route = createFileRoute("/acesso-paciente")({
  head: () => ({ meta: [{ title: "Acesso do paciente — INOVA" }] }),
  component: PatientLoginPage,
});
