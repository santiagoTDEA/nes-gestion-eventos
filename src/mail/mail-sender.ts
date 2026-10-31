import { Logger } from '@nestjs/common';
import type { Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Envío de correos. La implementación se elige por configuración: SMTP cuando
 * hay credenciales (hoy la cuenta institucional de Microsoft 365) o la consola
 * en desarrollo. Cambiar de cuenta o de proveedor no toca el resto del código.
 */
export abstract class MailSender {
  abstract send(message: MailMessage): Promise<void>;
}

export class SmtpMailSender extends MailSender {
  constructor(
    private readonly transporter: Transporter,
    private readonly from: string,
  ) {
    super();
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
  }
}

/** Sin SMTP configurado: escribe el correo en la consola (solo para desarrollo). */
export class ConsoleMailSender extends MailSender {
  private readonly logger = new Logger('Correo (consola)');

  send(message: MailMessage): Promise<void> {
    this.logger.warn(
      `Para: ${message.to} · Asunto: ${message.subject}\n${message.text}`,
    );
    return Promise.resolve();
  }
}
