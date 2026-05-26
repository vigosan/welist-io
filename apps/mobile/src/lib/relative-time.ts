export function formatRelativeTime(
  input: string | number | Date,
  locale: string = "en"
): string {
  const date = new Date(input);
  const diffMs = date.getTime() - Date.now();
  const absSec = Math.abs(diffMs) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absSec < 45) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSec < 2700) return rtf.format(Math.round(diffMs / 60000), "minute");
  if (absSec < 79200) return rtf.format(Math.round(diffMs / 3600000), "hour");
  const absDay = absSec / 86400;
  if (absDay < 30) return rtf.format(Math.round(diffMs / 86400000), "day");
  if (absDay < 365)
    return rtf.format(Math.round(diffMs / (86400000 * 30)), "month");
  return rtf.format(Math.round(diffMs / (86400000 * 365)), "year");
}
