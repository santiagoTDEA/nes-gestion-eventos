/** Estados de cada paso de la cadena de aprobación de un evento. */
export enum ApprovalStatus {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
}

/** Orden del workflow: Elaboración -> Revisión -> Verificación -> Validación. */
export const APPROVAL_FLOW_ORDER = [
  'elaboracion',
  'revision',
  'verificacion',
  'validacion',
];

/** Nombre sin tildes ni mayúsculas, para comparar roles ("Revisión" == "revision"). */
export function normalizeRoleName(name?: string | null): string {
  return (name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Posición del rol en el workflow; los roles desconocidos quedan al final. */
export function flowPosition(roleName?: string | null): number {
  const index = APPROVAL_FLOW_ORDER.indexOf(normalizeRoleName(roleName));

  return index === -1 ? APPROVAL_FLOW_ORDER.length : index;
}

export function isFirstStep(roleName?: string | null): boolean {
  return flowPosition(roleName) === 0;
}

/** Estado general del evento dentro del workflow. */
export enum WorkflowStatus {
  EN_FLUJO = 'en_flujo',
  DEVUELTO = 'devuelto',
}
