import { Injectable } from '@nestjs/common';

import { Person } from '../entities/person.entity';
import { CreatePersonDto, UpdatePersonDto } from '../dto/person.dto';
import { PersonRepository } from '../repository/person.repository';

import { FacultyRepository } from '../../faculty/repository/faculty.repository';
import { RoleRepository } from '../../roles/repositories/role.repository';
import { StatusRepository } from '../../state/repositories/state.repository';
import { ErrorManager } from '../../utils/error.manager';

@Injectable()
export class PersonService {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly facultyRepository: FacultyRepository,
    private readonly statusRepository: StatusRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async findAll(): Promise<Person[]> {
    return this.personRepository.findAll();
  }

  async findById(idPerson: number): Promise<Person> {
    try {
      const person = await this.personRepository.findById(idPerson);

      if (!person) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se encontró la persona .`,
        });
      }

      return person;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async create(createPersonDto: CreatePersonDto): Promise<Person> {
    try {
      const existingPerson = await this.personRepository.findByCedula(
        createPersonDto.cedula,
      );

      if (existingPerson) {
        throw new ErrorManager({
          type: 'CONFLICT',
          message: `Ya existe una persona con la cédula "${createPersonDto.cedula}"`,
        });
      }

      const faculty = await this.facultyRepository.findById(
        createPersonDto.facultyId,
      );

      if (!faculty) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se encontró la facultad .`,
        });
      }
      if (faculty.status.statusName.toLowerCase().trim() === 'inactivo') {
        throw new ErrorManager({
          type: 'CONFLICT',
          message: `No se puede asignar una persona a una facultad inactiva`,
        });
      }

      const role = await this.roleRepository.findById(createPersonDto.roleId);

      if (!role) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se encontró el rol .`,
        });
      }

      const status = await this.statusRepository.findById(
        createPersonDto.statusId,
      );

      if (!status) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: 'No se encontró el estado',
        });
      }

      const person = new Person();

      person.cedula = createPersonDto.cedula;
      person.email = createPersonDto.email;
      person.phone = createPersonDto.phone;
      person.address = createPersonDto.address;

      person.faculty = faculty;
      person.role = role;
      person.status = status;

      return this.personRepository.create(person);
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async findByIdForUpdate(idPerson: number): Promise<Person> {
    try {
      const person = await this.personRepository.findByIdForUpdate(idPerson);

      if (!person) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se encontró la persona .`,
        });
      }

      return person;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async update(
    idPerson: number,
    updatePersonDto: UpdatePersonDto,
  ): Promise<Person> {
    try {
      const person = await this.findByIdForUpdate(idPerson);

      if (updatePersonDto.cedula !== undefined) {
        const existingPerson = await this.personRepository.findByCedula(
          updatePersonDto.cedula,
        );

        if (existingPerson && existingPerson.id !== idPerson) {
          throw new ErrorManager({
            type: 'CONFLICT',
            message: `Ya existe una persona con la cédula "${updatePersonDto.cedula}"`,
          });
        }

        person.cedula = updatePersonDto.cedula;
      }

      if (updatePersonDto.email !== undefined) {
        person.email = updatePersonDto.email;
      }

      if (updatePersonDto.phone !== undefined) {
        person.phone = updatePersonDto.phone;
      }

      if (updatePersonDto.address !== undefined) {
        person.address = updatePersonDto.address;
      }

      if (updatePersonDto.facultyId !== undefined) {
        const faculty = await this.facultyRepository.findById(
          updatePersonDto.facultyId,
        );

        if (!faculty) {
          throw new ErrorManager({
            type: 'NOT_FOUND',
            message: `No se encontró la facultad.`,
          });
        }

        person.faculty = faculty;
      }

      if (updatePersonDto.roleId !== undefined) {
        const role = await this.roleRepository.findById(updatePersonDto.roleId);

        if (!role) {
          throw new ErrorManager({
            type: 'NOT_FOUND',
            message: `No se encontró el rol.`,
          });
        }

        person.role = role;
      }

      if (updatePersonDto.statusId !== undefined) {
        const status = await this.statusRepository.findById(
          updatePersonDto.statusId,
        );

        if (!status) {
          throw new ErrorManager({
            type: 'NOT_FOUND',
            message: `No se encontró el estado.`,
          });
        }

        person.status = status;
      }

      const updatedPerson = await this.personRepository.update(
        idPerson,
        person,
      );

      if (!updatedPerson) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se pudo actualizar la persona.`,
        });
      }

      return updatedPerson;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async remove(idPerson: number): Promise<void> {
    try {
      await this.findById(idPerson);

      await this.personRepository.delete(idPerson);
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }
}
