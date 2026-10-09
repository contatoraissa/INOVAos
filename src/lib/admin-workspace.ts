import { z } from "zod";
import { adminDefaults, adminSchema, adminReference } from "./admin-demo.ts";

export const feedbackCategories = [
  "Experiência geral",
  "Agenda",
  "Envios e documentos",
  "Resultados",
  "Usabilidade",
  "Suporte",
] as const;
export const subscriptionStatuses = ["Teste", "Ativa", "Pagamento pendente", "Cancelada"] as const;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value + "T12:00:00Z");
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Data inválida.");
export const workspaceSchema = adminSchema
  .extend({
    version: z.literal(2),
    users: z
      .array(
        adminSchema.shape.users.element.extend({
          createdAt: z.string().datetime(),
          lastAccess: z.string().datetime(),
        }),
      )
      .max(200),
    contacts: adminSchema.shape.contacts.max(1000),
    activities: z
      .array(
        z.object({
          id: z.string(),
          userId: z.string(),
          at: z.string().datetime(),
          feature: z.enum(["Acesso", "Agenda", "Envio", "Resultados", "Pedido de exames"]),
        }),
      )
      .max(3000),
    subscriptions: z
      .array(
        z.object({
          userId: z.string(),
          plan: z.enum(["Essencial", "Profissional"]),
          status: z.enum(subscriptionStatuses),
          monthlyCents: z.number().int().min(0).max(1000000),
          renewal: date,
        }),
      )
      .max(200),
    tasks: z
      .array(
        z.object({
          id: z.string(),
          userId: z.string(),
          kind: z.enum(["Reativação", "Pedido de feedback", "Acompanhamento"]),
          channel: z.enum(["E-mail", "WhatsApp", "Telefone"]),
          due: date,
          state: z.enum(["Planejado", "Concluído"]),
          note: z.string().trim().min(1).max(2000),
          at: z.string().datetime(),
        }),
      )
      .max(1000),
    feedback: z
      .array(
        z.object({
          id: z.string(),
          userId: z.string(),
          rating: z.number().int().min(1).max(5),
          category: z.enum(feedbackCategories),
          comment: z.string().trim().min(1).max(2000),
          at: z.string().datetime(),
        }),
      )
      .max(1000),
    audit: z
      .array(
        z.object({
          id: z.string(),
          at: z.string().datetime(),
          action: z.string().max(200),
          detail: z.string().max(2000),
        }),
      )
      .max(1000),
  })
  .superRefine((data, ctx) => {
    const ids = new Set(data.users.map((user) => user.id));
    if (ids.size !== data.users.length)
      ctx.addIssue({ code: "custom", message: "Usuários duplicados." });
    for (const collection of [
      data.activities,
      data.tasks,
      data.feedback,
      data.subscriptions,
      data.contacts,
    ]) {
      if (collection.some((entry) => !ids.has(entry.userId)))
        ctx.addIssue({ code: "custom", message: "Registro associado a usuário inexistente." });
    }
    if (
      data.subscriptions.some(
        (entry) => data.users.find((user) => user.id === entry.userId)?.role !== "Médico",
      ) ||
      new Set(data.subscriptions.map((entry) => entry.userId)).size !== data.subscriptions.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Assinaturas devem ser únicas e associadas a médicos.",
      });
  });
export type AdminWorkspace = z.infer<typeof workspaceSchema>;
export type AdminUser = AdminWorkspace["users"][number];
export const adminDate = "2026-10-08";
export const adminStorageKey = "inova-demo-admin-v2";
export const adminId = () =>
  globalThis.crypto?.randomUUID?.() ?? `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function daysAway(user: AdminUser) {
  return Math.max(0, Math.floor((adminReference - Date.parse(user.lastAccess)) / 86400000));
}
export function usage(user: AdminUser) {
  if (user.status === "Desativado") return "Desativado";
  return daysAway(user) <= 7 ? "Em uso" : daysAway(user) <= 30 ? "Atenção" : "Sem uso recente";
}
export function latestFeedback(data: AdminWorkspace, userId: string) {
  return data.feedback
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}
export function satisfaction(data: AdminWorkspace, userId: string) {
  const latest = latestFeedback(data, userId);
  return !latest
    ? "Sem feedback"
    : latest.rating >= 4
      ? "Positivo"
      : latest.rating <= 2
        ? "Negativo"
        : "Neutro";
}
export function workspaceDefaults(): AdminWorkspace {
  const users = adminDefaults.users.map((user) => ({ ...user }));
  const activities: AdminWorkspace["activities"] = users.flatMap((user, index) =>
    Array.from({ length: 2 + (index % 4) }, (_, i) => ({
      id: `seed-activity-${index}-${i}`,
      userId: user.id,
      at: new Date(Date.parse(user.lastAccess) - i * 2 * 86400000).toISOString(),
      feature: (["Acesso", "Agenda", "Envio", "Resultados", "Pedido de exames"] as const)[
        (i + index) % 5
      ]!,
    })),
  );
  return workspaceSchema.parse({
    version: 2,
    users,
    contacts: [],
    activities,
    subscriptions: users
      .filter((user) => user.role === "Médico")
      .map((user, index) => ({
        userId: user.id,
        plan: index % 2 ? "Profissional" : "Essencial",
        status: subscriptionStatuses[index],
        monthlyCents: index % 2 ? 24900 : 14900,
        renewal: "2026-10-20",
      })),
    tasks: [
      {
        id: "seed-task-1",
        userId: "doctor-1",
        kind: "Reativação",
        channel: "E-mail",
        due: "2026-10-07",
        state: "Planejado",
        note: "SIMULAÇÃO: entender por que não voltou a usar a plataforma.",
        at: "2026-10-06T14:00:00Z",
      },
    ],
    feedback: [
      {
        id: "seed-feedback-1",
        userId: "doctor-0",
        rating: 5,
        category: "Agenda",
        comment: "EXEMPLO FICTÍCIO: a organização dos próximos compromissos ajudou na preparação.",
        at: "2026-10-08T12:00:00Z",
      },
      {
        id: "seed-feedback-2",
        userId: "doctor-1",
        rating: 2,
        category: "Usabilidade",
        comment: "EXEMPLO FICTÍCIO: tive dificuldade para encontrar os documentos enviados.",
        at: "2026-10-07T12:00:00Z",
      },
      {
        id: "seed-feedback-3",
        userId: "mariana-oliveira",
        rating: 4,
        category: "Envios e documentos",
        comment: "EXEMPLO FICTÍCIO: gostei de preparar as perguntas antes da consulta.",
        at: "2026-10-07T13:00:00Z",
      },
      {
        id: "seed-feedback-4",
        userId: users.find((user) => user.role === "Paciente" && user.id !== "mariana-oliveira")!
          .id,
        rating: 3,
        category: "Experiência geral",
        comment: "EXEMPLO FICTÍCIO: ainda estou aprendendo a usar.",
        at: "2026-10-06T12:00:00Z",
      },
    ],
    audit: [],
  });
}
export function migrateAdmin(raw: unknown): AdminWorkspace {
  const legacy = adminSchema.parse(raw),
    defaults = workspaceDefaults(),
    ids = new Set(legacy.users.map((user) => user.id));
  return workspaceSchema.parse({
    ...defaults,
    ...legacy,
    activities: defaults.activities.filter((item) => ids.has(item.userId)),
    subscriptions: defaults.subscriptions.filter((item) => ids.has(item.userId)),
    feedback: defaults.feedback.filter((item) => ids.has(item.userId)),
    tasks: defaults.tasks.filter((item) => ids.has(item.userId)),
  });
}
export function workspaceMetrics(data: AdminWorkspace) {
  const ratings = data.users
    .map((user) => latestFeedback(data, user.id))
    .filter((entry): entry is NonNullable<typeof entry> => !!entry);
  return {
    total: data.users.length,
    enabled: data.users.filter((u) => u.status === "Ativo").length,
    disabled: data.users.filter((u) => u.status === "Desativado").length,
    engaged: data.users.filter((u) => usage(u) === "Em uso").length,
    attention: data.users.filter((u) => usage(u) === "Atenção").length,
    inactive: data.users.filter((u) => usage(u) === "Sem uso recente").length,
    mrr: data.subscriptions
      .filter((s) => s.status === "Ativa")
      .reduce((sum, s) => sum + s.monthlyCents, 0),
    overdue: data.subscriptions.filter((s) => s.status === "Pagamento pendente").length,
    positive: ratings.filter((f) => f.rating >= 4).length,
    negative: ratings.filter((f) => f.rating <= 2).length,
    neutral: ratings.filter((f) => f.rating === 3).length,
    unknown: data.users.length - ratings.length,
    average: ratings.length ? ratings.reduce((sum, f) => sum + f.rating, 0) / ratings.length : null,
    pendingTasks: data.tasks.filter((t) => t.state === "Planejado").length,
  };
}
export function activitySeries(data: AdminWorkspace, period: number) {
  return Array.from({ length: period }, (_, index) => {
    const day = new Date(Date.parse(adminDate + "T12:00:00Z") - (period - 1 - index) * 86400000)
      .toISOString()
      .slice(0, 10);
    const entries = data.activities.filter((item) => item.at.slice(0, 10) === day);
    return {
      day: day.slice(8) + "/" + day.slice(5, 7),
      date: day,
      events: entries.length,
      users: new Set(entries.map((item) => item.userId)).size,
    };
  });
}
export function adminSnapshot(data: AdminWorkspace) {
  const { mrr, ...metrics } = workspaceMetrics(data);
  return {
    referenceDate: adminDate,
    thresholds: { engagedDays: 7, inactiveDays: 30 },
    metrics: { ...metrics, mrrMonthlyBRL: mrr / 100, currency: "BRL" },
    users: data.users.map((user, index) => ({
      reference: `U${index + 1}`,
      role: user.role,
      account: user.status,
      usage: usage(user),
      daysSinceAccess: daysAway(user),
      satisfaction: satisfaction(data, user.id),
      rating: latestFeedback(data, user.id)?.rating ?? null,
      feedbackCategory: latestFeedback(data, user.id)?.category ?? null,
      subscription: data.subscriptions.find((s) => s.userId === user.id)?.status ?? null,
      pendingContacts: data.tasks.filter((t) => t.userId === user.id && t.state === "Planejado")
        .length,
    })),
    activity30Days: activitySeries(data, 30).reduce((sum, day) => sum + day.events, 0),
  };
}
export function safeCsvCell(value: unknown) {
  const text = String(value ?? "");
  return '"' + (/^[=+@\-\t\r\n]/.test(text) ? "'" : "") + text.replace(/"/g, '""') + '"';
}
export const adminMoney = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const adminDay = (value: string) => value.slice(0, 10).split("-").reverse().join("/");
