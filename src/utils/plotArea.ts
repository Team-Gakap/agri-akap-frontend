export function plotSizeHa(plot: { size_ha?: number | string | null } | null | undefined): number {
  const n = Number(plot?.size_ha);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function capToPlot(value: number | string, plotSize: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (plotSize > 0 && n > plotSize) return plotSize;
  return n;
}

export function capInputToPlot(raw: unknown, plotSize: number): string {
  if (raw === '' || raw == null) return '';
  const n = Number(raw);
  if (Number.isNaN(n)) return String(raw);
  return String(capToPlot(n, plotSize));
}
