/** tr-TR biçimlendirme yardımcıları — tüm sayılarda tabular-nums kullanılır. */

export function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const digits = Math.abs(value) >= 1000 ? 0 : 2;
  return fmtNum(value, digits);
}

export function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${fmtNum(value, 2)}%`;
}

/** 1.234.567.890 -> "1,23 mlr" */
export function fmtCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${fmtNum(value / 1e9, 2)} mlr`;
  if (abs >= 1e6) return `${fmtNum(value / 1e6, 1)} mln`;
  if (abs >= 1e3) return `${fmtNum(value / 1e3, 1)} bin`;
  return fmtNum(value, 0);
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** FX current gibi change_percent içermeyen yanıtlar için open'a göre hesap. */
export function pctFromOpen(
  last: number | null | undefined,
  open: number | null | undefined,
): number | null {
  if (!last || !open || open === 0) return null;
  return ((last - open) / open) * 100;
}
