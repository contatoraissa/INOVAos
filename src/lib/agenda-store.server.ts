import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { agendaInput, type AgendaEvent, type AgendaNotice } from "./agenda-contract.ts";
export function createAgendaStore(directory: string) {
  const file = join(directory, "agenda.json");
  function read(): { events: AgendaEvent[]; notices: AgendaNotice[] } {
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { events: [], notices: [] };
  }
  function save(data: ReturnType<typeof read>) {
    mkdirSync(directory, { recursive: true });
    const tmp = file + "." + randomUUID() + ".tmp";
    writeFileSync(tmp, JSON.stringify(data), { encoding: "utf8", mode: 0o600 });
    renameSync(tmp, file);
  }
  function notice(data: ReturnType<typeof read>, event: AgendaEvent, title: string) {
    data.notices.unshift({
      id: randomUUID(),
      patientId: event.patientId,
      at: event.updatedAt,
      title,
    });
    data.notices = data.notices.slice(0, 500);
  }
  return {
    list(patientIds: string[]) {
      return read().events.filter((e) => patientIds.includes(e.patientId));
    },
    notices(patientIds: string[]) {
      return read().notices.filter((e) => patientIds.includes(e.patientId));
    },
    create(raw: unknown) {
      const input = agendaInput.parse(raw);
      const data = read();
      if (data.events.length >= 500) throw new Error("Limite da agenda demonstrativa atingido.");
      const now = new Date().toISOString();
      const event: AgendaEvent = {
        ...input,
        id: randomUUID(),
        reason: "",
        createdAt: now,
        updatedAt: now,
      };
      data.events.push(event);
      notice(data, event, `${input.kind}: ${input.title} · ${input.status}`);
      save(data);
      return event;
    },
    cancel(id: string, patientId: string, audience: "doctor" | "patient", reason: string) {
      if (audience === "patient" && patientId !== "mariana-oliveira")
        throw new Error("Paciente indisponível.");
      if (!reason.trim() || reason.length > 1000)
        throw new Error("Informe o motivo do cancelamento.");
      const data = read();
      const event = data.events.find((e) => e.id === id && e.patientId === patientId);
      if (!event) throw new Error("Evento não encontrado.");
      if (event.status === "Cancelado") return event;
      event.status = "Cancelado";
      event.reason = reason.trim();
      event.updatedAt = new Date().toISOString();
      notice(data, event, `Cancelado: ${event.title} · ${event.reason}`);
      save(data);
      return event;
    },
    confirm(id: string, patientId: string) {
      const data = read();
      const event = data.events.find((e) => e.id === id && e.patientId === patientId);
      if (!event || event.status !== "Proposto")
        throw new Error("Somente eventos propostos podem ser confirmados.");
      event.status = "Confirmado";
      event.updatedAt = new Date().toISOString();
      notice(data, event, `Confirmado: ${event.title}`);
      save(data);
      return event;
    },
  };
}
export const agendaStore = createAgendaStore(join(process.cwd(), ".inova-demo", "agenda"));
