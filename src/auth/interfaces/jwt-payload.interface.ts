export interface RoleAccessPayload {
  module?: string;
  acciones?: string[];
}

export interface JwtRolePayload {
  id: string;
  name: string;
  permissionsFull?: boolean;
  modulesFull?: boolean;
  accesos?: RoleAccessPayload[];
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: JwtRolePayload;
  status: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  userId: string;
  username: string;
  role: JwtRolePayload;
  status: string;
}
