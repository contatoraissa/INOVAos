import { createFileRoute } from "@tanstack/react-router";
import { AdminPortal } from "@/components/inova/AdminPortal";
export const Route = createFileRoute("/admin-inova")({
  head: () => ({
    meta: [
      { title: "Administração INOVA · demonstração" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPortal,
});
