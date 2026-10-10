import { createFileRoute } from "@tanstack/react-router";
import { PatientPortal } from "../components/inova/PatientPortal";
import { AccountPatientPortal } from "../components/inova/AccountPatientPortal";
export const Route = createFileRoute("/portal-paciente")({
  head: () => ({ meta: [{ title: "Minha saúde — INOVA" }] }),
  component: PatientRoute,
});
function PatientRoute() {
  const { workspace } = Route.useSearch();
  return workspace === "account" ? <AccountPatientPortal /> : <PatientPortal />;
}
