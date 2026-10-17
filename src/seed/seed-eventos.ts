/**
 * Datos iniciales para poder crear y aprobar eventos: estados, facultades,
 * roles del flujo (Elaboración, Revisión, Verificación, Validación) y, por
 * cada rol, una persona y un usuario. Es idempotente: lo que ya existe
 * (por nombre, cédula o username) no se vuelve a crear.
 *
 * Uso:  npm run seed
 *
 * Las contraseñas son SOLO de desarrollo (el backend las guarda tal cual).
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Status } from '../state/entities/state.entity';
import { Faculty } from '../faculty/entities/faculty.entity';
import { Role } from '../roles/entities/role.entity';
import { Person } from '../person/entities/person.entity';
import { User } from '../auth/entities/auth.entity';

const STATUSES = ['Activo', 'Inactivo'];

const FACULTIES = [
  {
    name: 'Facultad de Ingeniería',
    department: 'Departamento de Ingeniería de Sistemas',
    email: 'ingenieria@universidad.edu.co',
    phone: '+57 604 1234567',
  },
  {
    name: 'Educación Continua',
    department: 'Modalidad de Educación Continua',
    email: 'educacion.continua@universidad.edu.co',
    phone: '+57 604 7654321',
  },
  {
    name: 'Extensión Académica',
    department: 'Dirección de Extensión Académica',
    email: 'extension@universidad.edu.co',
    phone: '+57 604 1112233',
  },
];

const EVENTOS_LEER_EDITAR = [
  { modulo: 'eventos', acciones: ['editar', 'leer'] },
  { modulo: 'aprobaciones', acciones: ['editar', 'leer'] },
];

const FLOW = [
  {
    role: {
      name: 'Elaboración',
      description:
        'Docente / Responsable: crea evento, edita y modifica su propio',
      accesos: [
        {
          modulo: 'eventos',
          acciones: ['crear', 'editar', 'eliminar', 'leer'],
        },
        { modulo: 'aprobaciones', acciones: ['leer'] },
      ],
    },
    faculty: 'Facultad de Ingeniería',
    person: {
      name: 'Elena Elaboración',
      cedula: '1000000001',
      email: 'elaboracion@universidad.edu.co',
      phone: '3000000001',
      address: 'Calle 1 # 10-01',
    },
    username: 'elaboracion',
    password: 'Elaboracion2026*',
  },
  {
    role: {
      name: 'Revisión',
      description:
        'Enlace de Extensión, director o coordinador: revisa eventos',
      accesos: EVENTOS_LEER_EDITAR,
    },
    faculty: 'Facultad de Ingeniería',
    person: {
      name: 'Rafael Revisión',
      cedula: '1000000002',
      email: 'revision@universidad.edu.co',
      phone: '3000000002',
      address: 'Calle 2 # 20-02',
    },
    username: 'revision',
    password: 'Revision2026*',
  },
  {
    role: {
      name: 'Verificación',
      description: 'Equipo Educación Continua: verifica eventos',
      accesos: EVENTOS_LEER_EDITAR,
    },
    faculty: 'Educación Continua',
    person: {
      name: 'Valeria Verificación',
      cedula: '1000000003',
      email: 'verificacion@universidad.edu.co',
      phone: '3000000003',
      address: 'Calle 3 # 30-03',
    },
    username: 'verificacion',
    password: 'Verificacion2026*',
  },
  {
    role: {
      name: 'Validación',
      description: 'Dirección de Extensión Académica: valida y aprueba eventos',
      accesos: EVENTOS_LEER_EDITAR,
    },
    faculty: 'Extensión Académica',
    person: {
      name: 'Valentín Validación',
      cedula: '1000000004',
      email: 'validacion@universidad.edu.co',
      phone: '3000000004',
      address: 'Calle 4 # 40-04',
    },
    username: 'validacion',
    password: 'Validacion2026*',
  },
];

async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const ds = app.get(DataSource);

  const statusRepo = ds.getRepository(Status);
  const facultyRepo = ds.getRepository(Faculty);
  const roleRepo = ds.getRepository(Role);
  const personRepo = ds.getRepository(Person);
  const userRepo = ds.getRepository(User);

  // Se crean en orden para que "Activo" quede con id 1.
  for (const statusName of STATUSES) {
    if (!(await statusRepo.findOneBy({ statusName }))) {
      await statusRepo.save(statusRepo.create({ statusName }));
    }
  }
  const active = await statusRepo.findOneByOrFail({ statusName: 'Activo' });

  for (const data of FACULTIES) {
    if (!(await facultyRepo.findOneBy({ name: data.name }))) {
      await facultyRepo.save(facultyRepo.create({ ...data, status: active }));
    }
  }

  for (const item of FLOW) {
    let role = await roleRepo.findOneBy({ name: item.role.name });
    if (!role) {
      role = await roleRepo.save(
        roleRepo.create({
          ...item.role,
          permissionsFull: false,
          modulesFull: false,
          isActive: true,
        }),
      );
    }

    const faculty = await facultyRepo.findOneByOrFail({ name: item.faculty });

    let person = await personRepo.findOneBy({ cedula: item.person.cedula });
    if (!person) {
      person = await personRepo.save(
        personRepo.create({ ...item.person, status: active, faculty, role }),
      );
    }

    if (!(await userRepo.findOneBy({ username: item.username }))) {
      await userRepo.save(
        userRepo.create({
          username: item.username,
          password: item.password,
          status: active,
          person,
        }),
      );
    }

    console.log(`OK  ${item.role.name.padEnd(13)} usuario: ${item.username}`);
  }

  await app.close();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
