export interface Env {
  PORT: number;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  JWT_SECRET: string;
  EXPIRATION_TIME: number;
  /** Envío de correos (recuperación de cuenta). Opcionales: sin ellos se usa la consola. */
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  MAIL_FROM?: string;
}
