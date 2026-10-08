import { randomUUID } from "node:crypto";
import { orderExams } from "../data/order-exams.ts";
import { orderInput, type ExamOrder, type OrderInput } from "./exam-order-contract.ts";
import { recordCareEvent } from "./care-store.server.ts";
import type { CareEvent } from "./care-contract.ts";
export function createOrderStore(
  now = () => Date.now(),
  onEvent?: (event: Omit<CareEvent, "read">) => void,
) {
  const entries = new Map<string, { requestId: string; order: ExamOrder }>();
  function expire() {
    for (const [id, item] of entries)
      if (now() - new Date(item.order.createdAt).getTime() >= 24 * 60 * 60 * 1000)
        entries.delete(id);
  }
  function find(id: string) {
    expire();
    const item = entries.get(id);
    if (!item) throw new Error("Pedido não encontrado ou expirado.");
    return item.order;
  }
  return {
    get: find,
    create(raw: OrderInput) {
      expire();
      const input = orderInput.parse(raw);
      const prior = [...entries.values()].find((item) => item.requestId === input.requestId);
      if (prior) return prior.order;
      const exams = input.exams.map((id) => {
        const exam = orderExams.find((item) => item.id === id);
        if (!exam) throw new Error("Exame não disponível no catálogo demonstrativo.");
        return { id: exam.id, name: exam.name };
      });
      if (entries.size >= 100) throw new Error("O limite de pedidos demonstrativos foi atingido.");
      const order: ExamOrder = {
        id: randomUUID(),
        patientId: input.patientId,
        doctorName: "Dr. Rafael Mendes",
        doctorCrm: "123456/SP · fictício",
        createdAt: new Date(now()).toISOString(),
        releasedAt: null,
        cancelledAt: null,
        status: "draft",
        exams,
        notes: input.notes,
      };
      entries.set(order.id, { requestId: input.requestId, order });
      return order;
    },
    list(patientId: string, audience: "doctor" | "patient") {
      expire();
      return [...entries.values()]
        .map((item) => item.order)
        .filter(
          (order) =>
            order.patientId === patientId && (audience === "doctor" || order.releasedAt !== null),
        )
        .reverse();
    },
    release(id: string) {
      const order = find(id);
      if (order.status === "cancelled") throw new Error("Pedido cancelado não pode ser liberado.");
      const first = order.releasedAt === null;
      order.status = "released";
      order.releasedAt ??= new Date(now()).toISOString();
      if (first)
        onEvent?.({
          id: `${id}:released`,
          patientId: order.patientId,
          at: order.releasedAt,
          title: "Seu médico solicitou exames",
          detail: `${order.exams.length} exame(s) liberado(s) por ${order.doctorName}.`,
          destination: "orders",
        });
      return order;
    },
    cancel(id: string) {
      const order = find(id);
      const first = order.cancelledAt === null;
      order.status = "cancelled";
      order.cancelledAt ??= new Date(now()).toISOString();
      if (first && order.releasedAt)
        onEvent?.({
          id: `${id}:cancelled`,
          patientId: order.patientId,
          at: order.cancelledAt,
          title: "Pedido cancelado pelo médico",
          detail: "Confira o pedido antes de realizar ou agendar exames.",
          destination: "orders",
        });
      return order;
    },
    quote(id: string, simulate = false) {
      const order = find(id);
      if (order.status !== "released")
        throw new Error("Apenas pedidos liberados podem consultar preços.");
      const base = order.exams.reduce(
        (total, exam) =>
          total +
          ({ hemograma: 2500, "glicemia-jejum": 1500, "perfil-lipidico": 4500 }[exam.id] ?? 3500),
        0,
      );
      const items = order.exams.map((exam) => ({
        id: exam.id,
        name: exam.name,
        cents:
          { hemograma: 2500, "glicemia-jejum": 1500, "perfil-lipidico": 4500 }[exam.id] ?? 3500,
      }));
      return {
        connected: false as const,
        simulated: simulate,
        provider: "S2 Médica",
        message: simulate
          ? "SIMULAÇÃO: cotação fictícia para os exames deste pedido. Sem consulta à API real da S2 Labs."
          : "Consulta de preços ainda não conectada. Aguardamos acesso à API e o mapeamento dos exames com a S2.",
        prices: simulate
          ? [
              {
                name: "Laboratório Centro · fictício",
                collection: "Coleta na unidade",
                totalCents: base,
                distanceKm: 2.4,
                address: "Região central · Sorocaba/SP · endereço fictício",
                feeCents: 0,
                items,
              },
              {
                name: "Laboratório Zona Norte · fictício",
                collection: "Coleta na unidade",
                totalCents: Math.round(base * 1.15),
                distanceKm: 6.8,
                address: "Zona norte · Sorocaba/SP · endereço fictício",
                feeCents: 0,
                items: items.map((item) => ({ ...item, cents: Math.round(item.cents * 1.15) })),
              },
              {
                name: "Coleta domiciliar · fictícia",
                collection: "Coleta domiciliar",
                totalCents: base + 5000,
                distanceKm: 4.8,
                address: "Região de Sorocaba/SP · cobertura fictícia",
                feeCents: 5000,
                items,
              },
            ]
          : [],
        externalUrl: "https://www.s2medica.com.br/",
        examNames: order.exams.map((item) => item.name),
      };
    },
  };
}
export const examOrderStore = createOrderStore(() => Date.now(), recordCareEvent);
