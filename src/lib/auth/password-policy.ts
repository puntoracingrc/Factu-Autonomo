export const MIN_ACCOUNT_PASSWORD_LENGTH = 12;

export const ACCOUNT_PASSWORD_POLICY_HINT =
  `Mínimo ${MIN_ACCOUNT_PASSWORD_LENGTH} caracteres. Puede ser una frase larga.`;

export function validateNewAccountPassword(password: string): string | null {
  if (password.length < MIN_ACCOUNT_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_ACCOUNT_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}
