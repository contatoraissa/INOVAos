import { createFileRoute } from "@tanstack/react-router";
import { PatientPortal } from "../components/inova/PatientPortal";
export const Route = createFileRoute("/portal-paciente")({
  head: () => ({ meta: [{ title: "Minha saúde — INOVA" }] }),
  component: PatientPortal,
});
