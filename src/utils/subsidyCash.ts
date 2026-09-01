export const CASH_UNIT = 'Cash (PHP)';

export function isCashUnit(unit?: string | null): boolean {
  return (unit || '').trim() === CASH_UNIT;
}
