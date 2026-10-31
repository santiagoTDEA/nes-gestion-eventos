import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

import { Env } from '../enviroments/models/enviroment.model';
import { ConsoleMailSender, MailSender, SmtpMailSender } from './mail-sender';

/**
 * Variables de entorno (las credenciales nunca van en el código):
 *   SMTP_HOST=smtp.office365.com  SMTP_PORT=587
 *   SMTP_USER=cuenta@dominio      SMTP_PASS=********
 *   MAIL_FROM="Gestión de Eventos <cuenta@dominio>"
 * Sin SMTP_HOST los correos se escriben en la consola.
 */
@Module({
  providers: [
    {
      provide: MailSender,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>): MailSender => {
        const host = config.get('SMTP_HOST', { infer: true });
        const logger = new Logger('MailModule');

        if (!host) {
          logger.warn(
            'SMTP_HOST no está configurado: los correos se escriben en la consola y no se envían.',
          );
          return new ConsoleMailSender();
        }

        const port = Number(config.get('SMTP_PORT', { infer: true }) ?? 587);
        const user = config.get('SMTP_USER', { infer: true });
        const pass = config.get('SMTP_PASS', { infer: true });

        if (!user || !pass) {
          logger.warn(
            'SMTP_HOST está configurado pero faltan SMTP_USER o SMTP_PASS: los correos se escriben en la consola y no se envían.',
          );
          return new ConsoleMailSender();
        }

        const transporter = createTransport({
          host,
          port,
          // 465 usa TLS directo; 587 (Microsoft 365) arranca en claro y exige STARTTLS.
          secure: port === 465,
          requireTLS: port !== 465,
          auth: { user, pass },
        });

        // Prueba el inicio de sesión al arrancar (sin bloquear): el error queda en la consola de una vez.
        transporter
          .verify()
          .then(() => logger.log(`SMTP listo: ${host}:${port} como ${user}`))
          .catch((error: Error) =>
            logger.error(
              `El SMTP rechazó la conexión (${host}:${port} como ${user}): ${error.message}`,
            ),
          );

        const from =
          config.get('MAIL_FROM', { infer: true }) ??
          `Gestión de Eventos <${user}>`;

        // Microsoft 365 (y la mayoría de servidores) solo deja enviar como el buzón que inició sesión.
        const fromAddress = /<([^>]+)>/.exec(from)?.[1] ?? from;
        if (fromAddress.trim().toLowerCase() !== user.trim().toLowerCase()) {
          logger.warn(
            `MAIL_FROM (${fromAddress}) no coincide con SMTP_USER (${user}): el servidor puede rechazar los envíos (SendAsDenied).`,
          );
        }

        return new SmtpMailSender(transporter, from);
      },
    },
  ],
  exports: [MailSender],
})
export class MailModule {}
