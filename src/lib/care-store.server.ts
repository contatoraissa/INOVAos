import { randomUUID } from "node:crypto";
import {
  favoriteInput,
  guidanceInput,
  type CareEvent,
  type FavoriteLab,
  type MedicalGuidance,
  type OrderProgress,
} from "./care-contract.ts";
const TTL = 24 * 60 * 60 * 1000;
function validPastDate(value: string, timestamp: number) {
  const date = new Date(`${value}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= today
  );
}
export function createCareStore(now = () => Date.now()) {
  const events = new Map<string, CareEvent>();
  const favorites = new Map<string, FavoriteLab>();
  const guidelines = new Map<string, { requestId: string; item: MedicalGuidance }>();
  const progress = new Map<string, OrderProgress>();
  function expire() {
    for (const [id, item] of events) if (now() - Date.parse(item.at) >= TTL) events.delete(id);
    for (const [id, item] of favorites)
      if (now() - Date.parse(item.createdAt) >= TTL) {
        favorites.delete(id);
        for (const entry of progress.values())
          if (entry.preferredLabId === id) entry.preferredLabId = null;
      }
    for (const [id, item] of guidelines)
      if (now() - Date.parse(item.item.createdAt) >= TTL) guidelines.delete(id);
    for (const [id, item] of progress)
      if (item.reportedAt && now() - Date.parse(item.reportedAt) >= TTL) progress.delete(id);
  }
  function addEvent(event: Omit<CareEvent, "read">) {
    expire();
    if (!events.has(event.id)) {
      if (events.size >= 1000) events.delete(events.keys().next().value!);
      events.set(event.id, { ...event, read: false });
    }
  }
  function getGuidance(id: string) {
    expire();
    const entry = guidelines.get(id);
    if (!entry) throw new Error("Orientação não encontrada ou expirada.");
    return entry.item;
  }
  return {
    getGuidance,
    event: addEvent,
    events(patientId: string) {
      expire();
      return [...events.values()]
        .filter((item) => item.patientId === patientId)
        .sort((a, b) => b.at.localeCompare(a.at));
    },
    read(patientId: string, ids: string[]) {
      expire();
      for (const id of ids) {
        const event = events.get(id);
        if (event?.patientId === patientId) event.read = true;
      }
    },
    favorite(raw: Parameters<typeof favoriteInput.parse>[0]) {
      expire();
      const data = favoriteInput.parse(raw);
      if ([...favorites.values()].filter((item) => item.patientId === data.patientId).length >= 10)
        throw new Error("Você pode guardar até 10 laboratórios favoritos.");
      const item = { ...data, id: randomUUID(), createdAt: new Date(now()).toISOString() };
      favorites.set(item.id, item);
      return item;
    },
    favorites(patientId: string) {
      expire();
      return [...favorites.values()].filter((item) => item.patientId === patientId);
    },
    removeFavorite(id: string, patientId: string) {
      expire();
      if (favorites.get(id)?.patientId !== patientId) throw new Error("Favorito não encontrado.");
      favorites.delete(id);
      for (const item of progress.values())
        if (item.preferredLabId === id) item.preferredLabId = null;
    },
    draft(raw: Parameters<typeof guidanceInput.parse>[0]) {
      expire();
      const data = guidanceInput.parse(raw);
      if (data.sourceDate && !validPastDate(data.sourceDate, now()))
        throw new Error("A data da fonte deve ser válida e não pode estar no futuro.");
      const previous = [...guidelines.values()].find((entry) => entry.requestId === data.requestId);
      if (previous) return previous.item;
      if (guidelines.size >= 100) throw new Error("Limite de orientações demonstrativas atingido.");
      const { requestId, ...content } = data;
      const item: MedicalGuidance = {
        ...content,
        id: randomUUID(),
        createdAt: new Date(now()).toISOString(),
        publishedAt: null,
        withdrawnAt: null,
        doctorName: "Dr. Rafael Mendes",
        reviewed: false,
      };
      guidelines.set(item.id, { requestId, item });
      return item;
    },
    guidance(patientId: string, audience: "doctor" | "patient") {
      expire();
      return [...guidelines.values()]
        .map((entry) => entry.item)
        .filter(
          (item) =>
            item.patientId === patientId &&
            (audience === "doctor" || (item.publishedAt && !item.withdrawnAt)),
        )
        .reverse();
    },
    publish(id: string) {
      const item = getGuidance(id);
      if (item.withdrawnAt)
        throw new Error("Orientação retirada não pode ser republicada; crie uma versão nova.");
      if (!item.publishedAt) {
        item.publishedAt = new Date(now()).toISOString();
        item.reviewed = true;
        addEvent({
          id: `${id}:published`,
          patientId: item.patientId,
          at: item.publishedAt,
          title: "Nova orientação do médico",
          detail: item.title,
          destination: item.category === "Preparo dos exames" ? "preparation" : "guidance",
        });
      }
      return item;
    },
    withdraw(id: string) {
      const item = getGuidance(id);
      if (!item.withdrawnAt) {
        item.withdrawnAt = new Date(now()).toISOString();
        if (item.publishedAt)
          addEvent({
            id: `${id}:withdrawn`,
            patientId: item.patientId,
            at: item.withdrawnAt,
            title: "Orientação retirada pelo médico",
            detail: item.title,
            destination: "guidance",
          });
      }
      return item;
    },
    progress(patientId: string) {
      expire();
      return [...progress.values()].filter((item) => item.patientId === patientId);
    },
    updateProgress(
      patientId: string,
      orderId: string,
      preferredLabId: string | null,
      performedOn: string | null,
    ) {
      expire();
      if (preferredLabId && favorites.get(preferredLabId)?.patientId !== patientId)
        throw new Error("Escolha um favorito deste paciente.");
      if (performedOn && !validPastDate(performedOn, now()))
        throw new Error("Informe uma data válida de realização, até hoje.");
      const previous = progress.get(orderId);
      const item: OrderProgress = {
        patientId,
        orderId,
        preferredLabId,
        performedOn,
        reportedAt: new Date(now()).toISOString(),
      };
      progress.set(orderId, item);
      if (performedOn && previous?.performedOn !== performedOn)
        addEvent({
          id: randomUUID(),
          patientId,
          at: item.reportedAt!,
          title: "Realização de exame informada por você",
          detail: `Data informada: ${performedOn.split("-").reverse().join("/")}. Sem confirmação do laboratório.`,
          destination: "orders",
        });
      if (!performedOn && previous?.performedOn)
        addEvent({
          id: randomUUID(),
          patientId,
          at: item.reportedAt!,
          title: "Registro de realização corrigido por você",
          detail: "A informação de realização foi removida.",
          destination: "orders",
        });
      return item;
    },
  };
}
export const careStore = createCareStore();
export const recordCareEvent = (event: Omit<CareEvent, "read">) => careStore.event(event);
