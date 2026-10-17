import { normalizeRoleName } from '../../events/constants/approval-flow';

/** Estados de una solicitud de difusión. Las reglas de paso viven aquí, en código. */
export enum DiffusionStatus {
  SOLICITADA = 'solicitada',
  EN_DISENO = 'en_diseno',
  EN_REVISION = 'en_revision',
  PUBLICADA = 'publicada',
}

/** Qué se pidió en el formulario de logística del evento. */
export enum DiffusionRequestType {
  PIEZAS = 'piezas',
  DIFUSION = 'difusion',
}

/** Área que atiende la solicitud. */
export enum DiffusionArea {
  COMUNICACIONES = 'comunicaciones',
  PRODUCCION_MEDIOS = 'produccion_medios',
}

/** Tipos de pieza que se guardan en el repositorio. */
export enum DiffusionAssetType {
  FLYER = 'flyer',
  VIDEO = 'video',
  BANNER = 'banner',
  HISTORIAS = 'historias',
  CORREOS = 'correos',
}

/** Roles que ejecutan cada área (comparados sin tildes ni mayúsculas). */
export const AREA_ROLE: Record<DiffusionArea, string> = {
  [DiffusionArea.COMUNICACIONES]: 'comunicaciones',
  [DiffusionArea.PRODUCCION_MEDIOS]: 'produccion y medios',
};

export const AREA_LABEL: Record<DiffusionArea, string> = {
  [DiffusionArea.COMUNICACIONES]: 'Comunicaciones',
  [DiffusionArea.PRODUCCION_MEDIOS]: 'Centro de Producción y Medios',
};

/** Solicitudes que genera un evento aprobado, según su formulario de logística. */
export const REQUESTS_BY_LOGISTICS: {
  aspect: string;
  type: DiffusionRequestType;
  area: DiffusionArea;
}[] = [
  {
    aspect: 'Elaboración de piezas publicitarias',
    type: DiffusionRequestType.PIEZAS,
    area: DiffusionArea.COMUNICACIONES,
  },
  {
    aspect: 'Elaboración de piezas publicitarias',
    type: DiffusionRequestType.PIEZAS,
    area: DiffusionArea.PRODUCCION_MEDIOS,
  },
  {
    aspect: 'Difusión',
    type: DiffusionRequestType.DIFUSION,
    area: DiffusionArea.COMUNICACIONES,
  },
];

/** Piezas que puede subir cada solicitud. */
export function allowedAssetTypes(
  type: DiffusionRequestType,
  area: DiffusionArea,
): DiffusionAssetType[] {
  if (type === DiffusionRequestType.DIFUSION) {
    return [DiffusionAssetType.CORREOS];
  }

  return area === DiffusionArea.PRODUCCION_MEDIOS
    ? [DiffusionAssetType.VIDEO]
    : [
        DiffusionAssetType.FLYER,
        DiffusionAssetType.BANNER,
        DiffusionAssetType.HISTORIAS,
      ];
}

export type DiffusionActor = 'executor' | 'author';

export interface DiffusionTransition {
  from: DiffusionStatus;
  to: DiffusionStatus;
  by: DiffusionActor;
  label: string;
  /** La observación es obligatoria (devoluciones). */
  requiresNote?: boolean;
  /** Debe haber al menos una pieza subida. */
  requiresAsset?: boolean;
}

/** Único lugar donde se definen los pasos permitidos y quién los ejecuta. */
export const DIFFUSION_TRANSITIONS: DiffusionTransition[] = [
  {
    from: DiffusionStatus.SOLICITADA,
    to: DiffusionStatus.EN_DISENO,
    by: 'executor',
    label: 'Pasar a diseño',
  },
  {
    from: DiffusionStatus.EN_DISENO,
    to: DiffusionStatus.EN_REVISION,
    by: 'executor',
    label: 'Enviar a revisión',
    requiresAsset: true,
  },
  {
    from: DiffusionStatus.EN_REVISION,
    to: DiffusionStatus.PUBLICADA,
    by: 'author',
    label: 'Aprobar y publicar',
  },
  {
    from: DiffusionStatus.EN_REVISION,
    to: DiffusionStatus.EN_DISENO,
    by: 'author',
    label: 'Devolver a diseño',
    requiresNote: true,
  },
];

export function isAreaExecutor(
  roleName: string | undefined,
  area: DiffusionArea,
): boolean {
  return normalizeRoleName(roleName) === AREA_ROLE[area];
}
