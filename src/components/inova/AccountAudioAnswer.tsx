import { useMemo } from "react";
import { AudioAnswer, type AudioClip } from "./AudioAnswer";
import type { ConsultationPayload } from "@/lib/real-consultation-contract";
import type { PreparationField } from "@/lib/preparation-contract";
export function AccountAudioAnswer({
  field,
  label,
  item,
  disabled,
  onChange,
  onRecordingChange,
}: {
  field: PreparationField;
  label: string;
  item: ConsultationPayload["audios"][number] | undefined;
  disabled: boolean;
  onChange: (item: ConsultationPayload["audios"][number] | undefined) => void;
  onRecordingChange: (recording: boolean) => void;
}) {
  const clip = useMemo<AudioClip | undefined>(
    () =>
      item
        ? {
            id: field,
            blob: new Blob([Uint8Array.from(atob(item.data), (c) => c.charCodeAt(0))], {
              type: item.mime,
            }),
            mime: item.mime,
            duration: null,
          }
        : undefined,
    [field, item],
  );
  return (
    <AudioAnswer
      field={field}
      label={label}
      clip={clip}
      disabled={disabled}
      onRecordingChange={onRecordingChange}
      onChange={(value) => {
        if (!value) {
          onChange(undefined);
          return;
        }
        const reader = new FileReader();
        reader.onload = () =>
          onChange({ field, mime: value.mime, data: String(reader.result).split(",")[1]! });
        reader.readAsDataURL(value.blob);
      }}
    />
  );
}
