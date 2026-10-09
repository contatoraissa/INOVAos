import { createFileRoute } from "@tanstack/react-router";
import { AdminWorkspacePortal as AdminPortal } from "@/components/inova/AdminWorkspacePortal";
export const Route = createFileRoute("/admin-inova")({
  head: () => ({
    meta: [
      { title: "Administração INOVA · demonstração" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPortal,
});
