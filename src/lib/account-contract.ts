import { z } from "zod";

export const states =
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
export function validDocument(value: string, type: "cpf" | "cnpj") {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== (type === "cpf" ? 11 : 14) || /^(\d)\1+$/.test(digits)) return false;
  const numbers = [...digits].map(Number);
  const weights =
    type === "cpf"
      ? [
          [10, 9, 8, 7, 6, 5, 4, 3, 2],
          [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
        ]
      : [
          [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
          [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
        ];
  return weights.every((weight) => {
    const remainder = weight.reduce((sum, w, i) => sum + w * numbers[i]!, 0) % 11;
    return numbers[weight.length] === (remainder < 2 ? 0 : 11 - remainder);
  });
}
const document = (type: "cpf" | "cnpj") =>
  z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => validDocument(v, type), `${type.toUpperCase()} inválido.`);
const base = {
  fullName: z
    .string()
    .trim()
    .min(5)
    .max(200)
    .refine((v) => v.split(/\s+/).length >= 2, "Informe seu nome completo."),
  email: z.string().trim().email().max(254),
  password: z.string().min(12, "Use uma senha com pelo menos 12 caracteres.").max(128),
  consent: z.literal(true),
};
export const accountInput = z.discriminatedUnion("role", [
  z
    .object({
      ...base,
      role: z.literal("doctor"),
      crm: z.string().regex(/^\d{1,10}$/, "Informe o número do CRM."),
      crmState: z.string().refine((v) => states.includes(v), "Selecione a UF do CRM."),
      cnpj: z.union([z.literal(""), document("cnpj")]),
    })
    .strict(),
  z
    .object({
      ...base,
      role: z.literal("patient"),
      cpf: document("cpf"),
      birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((v) => {
          const date = new Date(v + "T12:00:00Z");
          return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === v &&
            v >= "1900-01-01" &&
            v <= new Date().toISOString().slice(0, 10)
          );
        }, "Informe uma data de nascimento válida."),
    })
    .strict(),
]);
