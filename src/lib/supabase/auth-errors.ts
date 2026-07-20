export function isEmailNotConfirmedError(message: string): boolean {
  return /not confirmed|email.*confirm|confirm.*email|correo.*confirm/i.test(
    message,
  );
}

export function friendlyAuthError(message: string): string {
  if (isEmailNotConfirmedError(message)) {
    return "Tu cuenta aún no está confirmada. Busca el email de confirmación de Factu y pulsa «Confirmar cuenta».";
  }
  return message;
}
