import { MailMessage } from '../mail/mail-sender';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] as string,
  );

/** Marco común de los correos: encabezado verde, contenido y pie. */
function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f3f7f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dfebe2">
    <tr><td style="background:#0f5a38;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:bold">Gestión de Eventos · TdeA</td></tr>
    <tr><td style="padding:24px">
      <h1 style="margin:0 0 12px;font-size:20px;color:#0b4a2e">${title}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:14px 24px;background:#f7fbf8;color:#6b7280;font-size:12px">Este es un mensaje automático; no respondas a este correo.</td></tr>
  </table>
</body></html>`;
}

export function recoveryCodeEmail(
  to: string,
  name: string,
  code: string,
  minutes: number,
): MailMessage {
  const safeName = escapeHtml(name);

  return {
    to,
    subject: `${code} es tu código para recuperar tu cuenta`,
    text:
      `Hola ${name}:\n\nTu código para recuperar tu cuenta de Gestión de Eventos es ${code}.\n` +
      `Vence en ${minutes} minutos y solo se puede usar una vez.\n\n` +
      'Si no pediste recuperar tu cuenta, ignora este correo: tu contraseña no cambia.',
    html: layout(
      'Recupera tu cuenta',
      `<p style="margin:0 0 16px;font-size:15px">Hola ${safeName}, escribe este código en la pantalla de recuperación:</p>
      <p style="margin:0 0 16px;padding:16px;border-radius:10px;background:#f0faf4;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0b4a2e">${code}</p>
      <p style="margin:0 0 8px;font-size:14px">Vence en <b>${minutes} minutos</b> y solo se puede usar una vez.</p>
      <p style="margin:0;font-size:13px;color:#6b7280">Si no pediste recuperar tu cuenta, ignora este correo: tu contraseña no cambia.</p>`,
    ),
  };
}

export function passwordChangedEmail(to: string, name: string): MailMessage {
  return {
    to,
    subject: 'Tu contraseña de Gestión de Eventos fue cambiada',
    text:
      `Hola ${name}:\n\nLa contraseña de tu cuenta se cambió desde la recuperación de cuenta.\n` +
      'Si no fuiste tú, contacta de inmediato al administrador de la plataforma.',
    html: layout(
      'Tu contraseña fue cambiada',
      `<p style="margin:0 0 12px;font-size:15px">Hola ${escapeHtml(name)}, la contraseña de tu cuenta se cambió desde la recuperación de cuenta.</p>
      <p style="margin:0;font-size:14px;color:#b91c1c"><b>Si no fuiste tú</b>, contacta de inmediato al administrador de la plataforma.</p>`,
    ),
  };
}
