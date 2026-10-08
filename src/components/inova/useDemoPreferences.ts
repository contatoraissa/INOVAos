import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ZodType } from "zod";
export function useDemoPreferences<T>(key: string, defaults: T, schema: ZodType<T>) {
  const [form, setForm] = useState<T>(defaults);
  const [saved, setSaved] = useState<T>(defaults);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          setForm(parsed.data);
          setSaved(parsed.data);
        } else
          setStorageError(
            "Preferências antigas não puderam ser recuperadas. Confira e salve novamente.",
          );
      }
    } catch {
      setStorageError("Não foi possível recuperar os dados deste navegador.");
    }
    setReady(true);
  }, [key, schema]);
  function save() {
    const result = schema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Confira os campos.");
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(result.data));
      setForm(result.data);
      setSaved(result.data);
      setStorageError("");
      toast.success("Alterações salvas neste navegador.");
    } catch {
      setStorageError("O navegador não permitiu salvar. As alterações ainda não foram gravadas.");
      toast.error("Não foi possível salvar neste navegador.");
    }
  }
  return {
    form,
    setForm,
    ready,
    storageError,
    save,
    dirty: JSON.stringify(form) !== JSON.stringify(saved),
    undo: () => setForm(saved),
    restore: () => setForm(defaults),
  };
}
