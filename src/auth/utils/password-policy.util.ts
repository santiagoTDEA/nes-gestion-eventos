export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 255;

/**
 * Reglas de una contraseña nueva. Devuelve lo que le falta; vacío si cumple.
 * Las mismas reglas las muestra la pantalla "Mi perfil" mientras se escribe.
 */
export function passwordPolicyErrors(password: string): string[] {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`debe tener mínimo ${PASSWORD_MIN_LENGTH} caracteres`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`no puede pasar de ${PASSWORD_MAX_LENGTH} caracteres`);
  }
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password)) {
    errors.push('debe tener al menos una letra');
  }
  if (!/\d/.test(password)) {
    errors.push('debe tener al menos un número');
  }
  if (/\s/.test(password)) {
    errors.push('no puede tener espacios');
  }

  return errors;
}

/**
 * Compara la contraseña escrita con la guardada. Hoy se guardan en texto plano
 * (igual que en el login); cuando se cifren con bcrypt solo cambia esta función.
 */
export function passwordMatches(stored: string, plain: string): boolean {
  return stored === plain;
}
