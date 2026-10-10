import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ZodType } from "zod";
import {
  getWorkspacePreference,
  saveWorkspacePreference,
  getDoctorProfileDefaults,
} from "@/lib/real-workspace";
import type { preferenceInput } from "@/lib/real-workspace-contract";
import type { z } from "zod";
export function useDemoPreferences<T>(
  key: string,
  defaults: T,
  schema: ZodType<T>,
  accountKind?: "profile" | "settings",
) {
  const [form, setForm] = useState<T>(defaults);
  const [saved, setSaved] = useState<T>(defaults);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    if (accountKind) {
      let alive = true;
      setReady(false);
      void Promise.all([
        getWorkspacePreference({ data: { kind: accountKind } }),
        accountKind === "profile" ? getDoctorProfileDefaults() : Promise.resolve(null),
      ])
        .then(([value, baseline]) => {
          if (!alive) return;
          const initial = value ?? baseline ?? defaults;
          if (value !== null) {
            const parsed = schema.safeParse(value);
            if (!parsed.success)
              throw new Error("Confira suas preferências antes de salvar novamente.");
          }
          // An incomplete profile can be filled in by its owner; no demo identity is substituted.
          setForm(initial as T);
          setSaved(initial as T);
          setStorageError("");
          setReady(true);
        })
        .catch((error) => {
          if (alive)
            setStorageError(
              error instanceof Error
                ? error.message
                : "Não foi possível carregar suas preferências.",
            );
        });
      return () => {
        alive = false;
      };
    }
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
    return undefined;
  }, [key, schema, accountKind]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save() {
    const result = schema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Confira os campos.");
      return;
    }
    try {
      if (accountKind)
        await saveWorkspacePreference({
          data: { kind: accountKind, value: result.data } as z.infer<typeof preferenceInput>,
        });
      else localStorage.setItem(key, JSON.stringify(result.data));
      setForm(result.data);
      setSaved(result.data);
      setStorageError("");
      toast.success(
        accountKind ? "Alterações salvas na sua conta." : "Alterações salvas neste navegador.",
      );
    } catch {
      setStorageError(
        accountKind
          ? "Não foi possível salvar na sua conta. Tente novamente."
          : "O navegador não permitiu salvar. As alterações ainda não foram gravadas.",
      );
      toast.error(
        accountKind
          ? "Não foi possível salvar na sua conta."
          : "Não foi possível salvar neste navegador.",
      );
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
