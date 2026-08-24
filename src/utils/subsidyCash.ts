export const CASH_UNIT = 'Cash (PHP)';
export const CASH_CAP = 1000;

export function isCashUnit(unit?: string | null): boolean {
  return (unit || '').trim() === CASH_UNIT;
}
