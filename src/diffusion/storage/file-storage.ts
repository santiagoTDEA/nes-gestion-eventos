import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { extname, join } from 'node:path';

/** Contrato de almacenamiento: hoy es disco local; luego puede ser Cloudinary o S3 sin tocar el resto. */
export abstract class FileStorage {
  /** Guarda el archivo y devuelve su ruta relativa pública. */
  abstract save(
    folder: string,
    file: { originalName: string; buffer: Buffer },
  ): Promise<string>;
  abstract remove(path: string): Promise<void>;
}

/** Carpeta pública del servidor; se sirve en /gestion-eventos/files. */
export const PUBLIC_ROOT = join(process.cwd(), 'public');
export const FILES_URL_PREFIX = '/gestion-eventos/files/';

const SAFE_EXTENSION = /^\.[a-z0-9]{1,8}$/;

@Injectable()
export class LocalFileStorage extends FileStorage {
  async save(
    folder: string,
    file: { originalName: string; buffer: Buffer },
  ): Promise<string> {
    const extension = extname(file.originalName).toLowerCase();
    const name = `${randomUUID()}${SAFE_EXTENSION.test(extension) ? extension : ''}`;
    const relative = `uploads/${folder}/${name}`;
    const target = join(PUBLIC_ROOT, relative);

    await fs.mkdir(join(PUBLIC_ROOT, 'uploads', folder), { recursive: true });
    await fs.writeFile(target, file.buffer);

    return relative.replace(/\\/g, '/');
  }

  async remove(path: string): Promise<void> {
    const target = join(PUBLIC_ROOT, path);

    // Nunca borrar fuera de la carpeta pública.
    if (!target.startsWith(PUBLIC_ROOT)) {
      return;
    }

    await fs.rm(target, { force: true });
  }
}
