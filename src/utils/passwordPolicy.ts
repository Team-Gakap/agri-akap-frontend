export const TEMPORARY_PASSWORD = 'Echague2026!';

export type PasswordRuleId = 'length' | 'upper' | 'lower' | 'number' | 'symbol';

export interface PasswordRule {
  id: PasswordRuleId;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'One lowercase letter', test: (value) => /[a-z]/.test(value) },
  { id: 'number', label: 'One number', test: (value) => /\d/.test(value) },
  { id: 'symbol', label: 'One symbol (e.g. ! @ # $)', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export const passwordIssues = (value: string): string[] => {
  const issues = PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.label);
  if (value === TEMPORARY_PASSWORD) {
    issues.push('Cannot reuse the municipal temporary password');
  }
  return issues;
};

export const isPasswordStrong = (value: string): boolean => passwordIssues(value).length === 0;
