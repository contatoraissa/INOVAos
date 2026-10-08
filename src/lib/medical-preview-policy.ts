export function canAccessMedicalPreview(
  email: string,
  role: string,
  allowedEmail: string | undefined,
) {
  return (
    role === "doctor" &&
    Boolean(allowedEmail?.trim()) &&
    email.trim().toLowerCase() === allowedEmail?.trim().toLowerCase()
  );
}
