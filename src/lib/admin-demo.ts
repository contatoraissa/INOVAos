import { z } from "zod";
import { patients } from "../data/demo.ts";
export const adminSchema = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      role: z.enum(["Médico", "Paciente"]),
      status: z.enum(["Ativo", "Desativado"]),
      createdAt: z.string(),
      lastAccess: z.string(),
    }),
  ),
  contacts: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      kind: z.enum(["Retorno de contato", "Pedido de feedback", "Feedback recebido"]),
      note: z.string().min(1).max(2000),
      at: z.string(),
    }),
  ),
});
export type AdminDemo = z.infer<typeof adminSchema>;
export const adminDefaults: AdminDemo = {
  users: [
    ...["Dr. Rafael Mendes", "Dra. Camila Ferreira", "Dr. Lucas Andrade", "Dra. Paula Santos"].map(
      (name, index) => ({
        id: `doctor-${index}`,
        name,
        email: `medico${index + 1}@example.com`,
        role: "Médico" as const,
        status: index === 3 ? ("Desativado" as const) : ("Ativo" as const),
        createdAt: `2026-0${index + 3}-10T12:00:00Z`,
        lastAccess: index === 0 ? "2026-10-08T12:00:00Z" : "2026-08-01T12:00:00Z",
      }),
    ),
    ...patients.map((p, index) => ({
      id: p.id,
      name: p.name,
      email: `paciente${index + 1}@example.com`,
      role: "Paciente" as const,
      status: index === 8 ? ("Desativado" as const) : ("Ativo" as const),
      createdAt: `2026-0${Math.min(9, index + 3)}-15T12:00:00Z`,
      lastAccess: index % 3 === 0 ? "2026-10-07T12:00:00Z" : "2026-08-15T12:00:00Z",
    })),
  ],
  contacts: [],
};
// Stable reference date for seeded demonstration access dates.
export const adminReference = Date.parse("2026-10-08T23:59:59-03:00");
export function isInactive(user: AdminDemo["users"][number]) {
  return user.status === "Ativo" && adminReference - Date.parse(user.lastAccess) > 30 * 86400000;
}
export function adminMetrics(users: AdminDemo["users"]) {
  return {
    total: users.length,
    active: users.filter((u) => u.status === "Ativo").length,
    disabled: users.filter((u) => u.status === "Desativado").length,
    inactive: users.filter(isInactive).length,
  };
}
