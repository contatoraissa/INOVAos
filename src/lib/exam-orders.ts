import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { isLocalAiRequest } from "./ai-access";
import { orderInput, quoteInput } from "./exam-order-contract";
import { examOrderStore } from "./exam-order-store.server";
import { agendaInput } from "./agenda-contract";
import { agendaStore } from "./agenda-store.server";
function guard() {
  const request = getRequest();
  if (
    !isLocalAiRequest({
      development: import.meta.env.DEV,
      enabled: process.env["INOVA_AI_ENABLED"] === "true",
      url: request.url,
      origin: request.headers.get("origin"),
      additionalOrigin: process.env["INOVA_AI_ORIGIN"],
    })
  )
    throw new Error(
      "Pedidos disponíveis apenas no ambiente demonstrativo de desenvolvimento autorizado.",
    );
}
export const createExamOrder = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(async ({ data }) => {
    guard();
    return examOrderStore.create(data);
  });
export const listExamOrders = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().max(100), audience: z.enum(["doctor", "patient"]) }))
  .handler(async ({ data }) => {
    guard();
    return examOrderStore.list(data.patientId, data.audience);
  });
export const releaseExamOrder = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    guard();
    return examOrderStore.release(data.id);
  });
export const cancelExamOrder = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    guard();
    const order = examOrderStore.cancel(data.id);
    for (const event of agendaStore
      .list([order.patientId])
      .filter((item) => item.orderId === order.id && item.status !== "Cancelado")) {
      agendaStore.cancel(
        event.id,
        order.patientId,
        "doctor",
        "Pedido de exames cancelado pelo médico. Confira com o laboratório; o cancelamento externo não é automático.",
      );
    }
    return order;
  });
export const scheduleExamOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid(),
      date: agendaInput.innerType().shape.date,
      time: agendaInput.innerType().shape.time,
      laboratory: z.string().trim().min(2).max(150),
    }),
  )
  .handler(async ({ data }) => {
    guard();
    const order = examOrderStore.get(data.orderId);
    if (order.patientId !== "mariana-oliveira" || order.status !== "released")
      throw new Error("Pedido indisponível para informar a coleta.");
    const existing = agendaStore
      .list([order.patientId])
      .find((event) => event.orderId === order.id && event.status !== "Cancelado");
    if (existing)
      throw new Error(
        "Este pedido já tem uma coleta na agenda. Cancele o evento anterior para informar outra data.",
      );
    return agendaStore.create({
      patientId: order.patientId,
      audience: "patient",
      orderId: order.id,
      title: `Coleta: ${order.exams.map((exam) => exam.name).join(", ")}`.slice(0, 120),
      kind: "Exame",
      date: data.date,
      time: data.time,
      status: "Proposto",
      notes: `Coleta informada pelo paciente no laboratório ${data.laboratory}. Pedido de ${order.doctorName}. Sem confirmação ou agendamento automático no laboratório.`,
    });
  });
export const getS2Quote = createServerFn({ method: "POST" })
  .validator(quoteInput)
  .handler(async ({ data }) => {
    guard();
    return examOrderStore.quote(data.id, data.simulate);
  });
