import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSessionId } from "@/lib/session-id";
import {
  MAX_AUDIO_BYTES,
  MAX_RECORDING_SECONDS,
  type PreparationField,
} from "@/lib/preparation-contract";
export type AudioClip = {
  id: string;
  blob: Blob;
  mime: "audio/webm" | "audio/ogg" | "audio/mp4" | "audio/wav" | "audio/mpeg";
  duration: number | null;
};
export function AudioAnswer({
  field,
  label,
  clip,
  disabled,
  onChange,
  onRecordingChange,
}: {
  field: PreparationField;
  label: string;
  clip: AudioClip | undefined;
  disabled: boolean;
  onChange: (clip: AudioClip | undefined) => void;
  onRecordingChange: (recording: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [supported, setSupported] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const invalidateRequest = useCallback(() => {
    generation.current++;
  }, []);
  const discard = useRef(false);
  const began = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const callbacks = useRef({ onChange, onRecordingChange });
  callbacks.current = { onChange, onRecordingChange };
  function release() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }
  function finish(cancel = false) {
    discard.current = cancel;
    generation.current++;
    if (recorder.current?.state === "recording") recorder.current.stop();
    else {
      release();
      setRequesting(false);
      callbacks.current.onRecordingChange(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    setSupported(
      window.isSecureContext &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== "undefined",
    );
    return () => {
      mounted.current = false;
      invalidateRequest();
      discard.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
      callbacks.current.onRecordingChange(false);
    };
  }, [invalidateRequest]);
  useEffect(() => {
    if (!clip) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(clip.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [clip]);
  async function start() {
    if (disabled || requesting || recording) return;
    setError("");
    setRequesting(true);
    discard.current = false;
    callbacks.current.onRecordingChange(true);
    const attempt = ++generation.current;
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || generation.current !== attempt) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = next;
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/webm",
      ].find((item) => MediaRecorder.isTypeSupported(item));
      const instance = mime ? new MediaRecorder(next, { mimeType: mime }) : new MediaRecorder(next);
      recorder.current = instance;
      const chunks: Blob[] = [];
      let bytes = 0;
      instance.ondataavailable = ({ data }) => {
        if (data.size) {
          chunks.push(data);
          bytes += data.size;
        }
        if (bytes > MAX_AUDIO_BYTES) {
          discard.current = true;
          if (instance.state === "recording") instance.stop();
          if (mounted.current) setError("O áudio ultrapassou 5 MB. Grave uma mensagem mais curta.");
        }
      };
      instance.onerror = () => {
        discard.current = true;
        release();
        if (mounted.current) {
          setError("Não foi possível gravar. Tente novamente.");
          setRecording(false);
          setRequesting(false);
          callbacks.current.onRecordingChange(false);
        }
      };
      instance.onstop = () => {
        const duration = Math.min(
          MAX_RECORDING_SECONDS,
          Math.max(1, Math.round((Date.now() - began.current) / 1000)),
        );
        release();
        recorder.current = null;
        if (!mounted.current) return;
        setRecording(false);
        setRequesting(false);
        callbacks.current.onRecordingChange(false);
        if (discard.current) return;
        const type = instance.mimeType.split(";")[0] as AudioClip["mime"];
        const blob = new Blob(chunks, { type: instance.mimeType });
        if (
          !blob.size ||
          !["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"].includes(type)
        ) {
          setError("A gravação ficou vazia ou em formato não suportado. Tente novamente.");
          return;
        }
        callbacks.current.onChange({ id: createSessionId(), blob, mime: type, duration });
      };
      began.current = Date.now();
      setSeconds(0);
      instance.start(1000);
      setRequesting(false);
      setRecording(true);
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - began.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS && instance.state === "recording") instance.stop();
      }, 500);
    } catch (cause) {
      release();
      if (!mounted.current || generation.current !== attempt) return;
      setRequesting(false);
      callbacks.current.onRecordingChange(false);
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? "Permita o acesso ao microfone nas configurações do navegador e tente novamente."
          : name === "NotFoundError"
            ? "Nenhum microfone foi encontrado. Conecte um ou adicione um arquivo de áudio."
            : "Não foi possível acessar o microfone. Confira se ele está disponível.",
      );
    }
  }
  async function attach(file?: File) {
    if (!file) return;
    setError("");
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    const mime = (
      {
        webm: "audio/webm",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
        mp4: "audio/mp4",
        wav: "audio/wav",
        mp3: "audio/mpeg",
      } as const
    )[extension as "webm" | "ogg" | "m4a" | "mp4" | "wav" | "mp3"];
    if (!mime || !file.size || file.size > MAX_AUDIO_BYTES)
      setError("Adicione um áudio WebM, OGG, M4A, WAV ou MP3 de até 5 MB.");
    else onChange({ id: createSessionId(), blob: file, mime, duration: null });
    if (fileInput.current) fileInput.current.value = "";
  }
  return (
    <div
      className="mt-3 rounded-xl border border-border bg-muted/20 p-3"
      aria-label={`Áudio: ${label}`}
    >
      {clip && url ? (
        <>
          <audio
            controls
            preload="metadata"
            src={url}
            className="w-full"
            aria-label={`Ouvir áudio: ${label}`}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {clip.duration ? `${clip.duration}s · ` : ""}Ouça antes de enviar.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                onChange(undefined);
                setError("");
              }}
              aria-label={`Apagar áudio: ${label}`}
            >
              <Trash2 className="size-3" />
              Apagar e gravar outro
            </Button>
          </div>
        </>
      ) : recording ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-xs font-medium text-red-700">
            <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-red-500" />
            Gravando · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => finish()}
            aria-label={`Concluir áudio: ${label}`}
          >
            <Square className="size-3" />
            Concluir
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => finish(true)}>
            <X className="size-3" />
            Descartar
          </Button>
        </div>
      ) : requesting ? (
        <div className="flex items-center gap-3">
          <p role="status" className="text-xs">
            Aguardando permissão do microfone…
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => finish(true)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !supported}
            onClick={() => {
              void start();
            }}
            aria-label={`Gravar áudio: ${label}`}
          >
            <Mic className="size-3" />
            Gravar áudio
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="size-3" />
            Adicionar áudio
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Até 3 minutos de gravação · 5 MB
          </span>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept="audio/webm,audio/ogg,audio/mp4,audio/wav,audio/mpeg,.m4a"
        aria-label={`Adicionar áudio: ${label}`}
        onChange={(event) => {
          void attach(event.target.files?.[0]);
        }}
      />
      {!supported && !clip && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Para gravar, abra este sistema em HTTPS ou{" "}
          <a
            className="text-brand-deep underline"
            href={
              typeof window !== "undefined"
                ? `http://localhost:${window.location.port}/acesso-paciente`
                : "/acesso-paciente"
            }
          >
            localhost neste computador
          </a>
          . Neste endereço, você pode adicionar um áudio já gravado.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
