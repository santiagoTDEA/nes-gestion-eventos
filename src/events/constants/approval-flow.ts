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

/** El evento completó la cadena de aprobación (todos los pasos firmados). */
export function isFullyApproved(
  approvals: { status: ApprovalStatus }[],
): boolean {
  return (
    approvals.length > 0 &&
    approvals.every((step) => step.status === ApprovalStatus.APROBADO)
  );
}

/** Zona horaria de Colombia (sin horario de verano), para no depender de la del servidor. */
const COLOMBIA_OFFSET = '-05:00';

/** Momento en que termina el evento: la hora de fin del último día (endDate). */
export function eventEndsAt(event: { endDate: string; endTime: string }): Date {
  const time =
    event.endTime.length === 5 ? `${event.endTime}:00` : event.endTime;
  return new Date(`${event.endDate}T${time}${COLOMBIA_OFFSET}`);
}

/** El evento ya pasó la hora de fin de su último día. */
export function hasFinished(
  event: { endDate: string; endTime: string },
  now = new Date(),
): boolean {
  return now >= eventEndsAt(event);
}
