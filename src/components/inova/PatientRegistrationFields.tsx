import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PatientRegistrationFields({
  realAccount = false,
  disabled = false,
}: {
  realAccount?: boolean;
  disabled?: boolean;
}) {
  const fields = [
    { label: "Nome completo", name: "name", required: true },
    { label: "CPF", name: "cpf", placeholder: "000.000.000-00", required: true },
    { label: "RG", name: "rg" },
    { label: "Data de nascimento", name: "birth", type: "date", required: true },
  ];
  const field = (item: {
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
  }) => (
    <div key={item.name}>
      <label htmlFor={`patient-${item.name}`} className="label">
        {item.label}
      </label>
      <Input {...item} id={`patient-${item.name}`} disabled={disabled} />
    </div>
  );
  return (
    <div className="grid gap-5 p-6 md:grid-cols-2">
      {fields.map(field)}
      <div>
        <label htmlFor="patient-sex" className="label">
          Sexo
        </label>
        <Select name="sex" disabled={disabled}>
          <SelectTrigger id="patient-sex">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="f">Feminino</SelectItem>
            <SelectItem value="m">Masculino</SelectItem>
            <SelectItem value="o">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {field({ label: "Telefone", name: "phone" })}
      {field({ label: "E-mail", name: "email", type: "email", required: realAccount })}
      {field({ label: "Endereço", name: "address" })}
      <p className="text-xs text-muted-foreground md:col-span-2">
        {realAccount
          ? "O paciente deve criar sua conta com este e-mail, CPF e nascimento. A confirmação do e-mail vincula a conta ao prontuário autorizado, preservando o histórico. Se o CPF já está na sua carteira, o cadastro existente será reutilizado."
          : "O e-mail identifica o contato do paciente nesta demonstração. Contas reais são cadastradas e vinculadas separadamente em Minha conta."}
      </p>
      <div className="md:col-span-2">
        <label htmlFor="patient-notes" className="label">
          Observações
        </label>
        <Textarea
          id="patient-notes"
          name="notes"
          disabled={disabled}
          className="min-h-24"
          placeholder="Informações adicionais relevantes para o cadastro"
        />
      </div>
      {realAccount && (
        <label className="flex items-start gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            name="identityConfirmed"
            required
            disabled={disabled}
            className="mt-1"
          />
          Conferi a identidade do paciente e seu e-mail. Autorizo o vínculo deste prontuário à conta
          com o mesmo CPF, nascimento e e-mail confirmado.
        </label>
      )}
    </div>
  );
}
