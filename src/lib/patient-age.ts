function parseCalendarDate(value: string): [number, number, number] | null {
  const brazilian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!brazilian && !iso) return null;
  const year = Number(brazilian?.[3] ?? iso?.[1]);
  const month = Number(brazilian?.[2] ?? iso?.[2]);
  const day = Number(brazilian?.[1] ?? iso?.[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return [year, month, day];
}
export function patientAgeOnDate(birth: string | undefined, onDate: string): number | null {
  const born = birth ? parseCalendarDate(birth) : null;
  const reference = parseCalendarDate(onDate);
  if (!born || !reference) return null;
  const [birthYear, birthMonth, birthDay] = born;
  const [year, month, day] = reference;
  const age =
    year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
  return age < 0 || age > 130 ? null : age;
}
