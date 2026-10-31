/** Datos básicos del usuario autenticado para mostrar en la interfaz. */
export interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: {
    id: string;
    name: string;
  } | null;
}
