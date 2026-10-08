import { useEffect, useState } from "react";
import { preparationLabels, type PreparationInput } from "@/lib/preparation-contract";
import type { AudioClip } from "./AudioAnswer";

export function PreparationReviewAudio({ clip }: { clip: AudioClip }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(clip.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [clip]);
  return (
    <audio controls src={url} className="mt-3 w-full" aria-label="Ouvir áudio antes de enviar" />
  );
}

export function PreparationReviewDocument({ file, name }: { file: File; name: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block break-words rounded-lg border border-border p-3 text-sm font-medium text-brand-deep underline"
    >
      Abrir PDF: {name}
    </a>
  );
}

export function PreparationReviewNotes({
  notes,
  audios,
}: {
  notes: PreparationInput["notes"];
  audios: Partial<Record<keyof PreparationInput["notes"], AudioClip>>;
}) {
  return (
    <div className="space-y-3">
      {(Object.keys(preparationLabels) as (keyof typeof notes)[]).map((field) => (
        <section key={field} className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold">{preparationLabels[field]}</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {notes[field].trim() || "Nenhum texto informado."}
          </p>
          {audios[field] && <PreparationReviewAudio clip={audios[field]} />}
        </section>
      ))}
    </div>
  );
}
