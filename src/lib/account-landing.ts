export function accountLanding(account: { role: string; medicalAccess?: boolean }) {
  if (account.role === "patient") return "/portal-paciente?workspace=account";
  if (account.role === "doctor" && account.medicalAccess) return "/patients?workspace=account";
  return "/minha-conta";
}
