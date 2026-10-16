export function isFutureLagosAppointment(
  date: string,
  time: string,
  now = Date.now(),
) {
  const timestamp = Date.parse(`${date}T${time}:00+01:00`);
  return Number.isFinite(timestamp) && timestamp > now;
}
