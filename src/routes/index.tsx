import { createFileRoute } from "@tanstack/react-router";
import { SalesPage } from "@/components/inova/SalesPage";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "INOVA | Cuidado em perspectiva" }] }),
  component: SalesPage,
});
