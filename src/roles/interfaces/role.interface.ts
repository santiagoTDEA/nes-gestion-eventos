export interface RoleProps {
  name: string;
  description?: string | null;
  permissionsFull?: boolean;
  modulesFull?: boolean;
  accesos?: AccesoRoleProps[];
  isActive?: boolean;
}

export interface AccesoRoleProps {
  modulo: string;
  acciones: string[];
}
