export type PatientDraft<T = unknown> = { patientId: string; updatedAt: string; value: T };
function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("inova-patient-drafts", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("drafts", { keyPath: "patientId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Armazenamento local indisponível."));
  });
}
async function operateDraft<T>(patientId: string, action: "read" | "save" | "remove", value?: T) {
  const db = await database();
  try {
    return await new Promise<PatientDraft<T> | null>((resolve, reject) => {
      const transaction = db.transaction("drafts", action === "read" ? "readonly" : "readwrite");
      const store = transaction.objectStore("drafts");
      const request =
        action === "read"
          ? store.get(patientId)
          : action === "remove"
            ? store.delete(patientId)
            : store.put({ patientId, value, updatedAt: new Date().toISOString() });
      let result: PatientDraft<T> | null = null;
      request.onsuccess = () => {
        if (action === "read") result = request.result ?? null;
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () =>
        reject(new Error("Não foi possível salvar o rascunho neste navegador."));
      transaction.onabort = () => reject(new Error("O salvamento local foi interrompido."));
    });
  } finally {
    db.close();
  }
}

let pending: Promise<unknown> = Promise.resolve();
export function patientDraft<T>(patientId: string, action: "read" | "save" | "remove", value?: T) {
  const operation = pending.then(() => operateDraft(patientId, action, value));
  pending = operation.catch(() => undefined);
  return operation;
}
