import { Injectable } from '@nestjs/common';
import { FacultyRepository } from '../repository/faculty.repository';
import { StatusRepository } from '../../state/repositories/state.repository';
import { Faculty } from '../entities/faculty.entity';
import { CreateFacultyDto, UpdateFacultyDto } from '../dto/faculty.dto';
import { ErrorManager } from '../../utils/error.manager';

@Injectable()
export class FacultyService {
  constructor(
    private readonly facultyRepository: FacultyRepository,
    private readonly statusRepository: StatusRepository,
  ) {}

  async findAll(): Promise<Faculty[]> {
    return this.facultyRepository.findAll();
  }

  async findById(idFaculty: number): Promise<Faculty> {
    try {
      const faculty = await this.facultyRepository.findById(idFaculty);

      if (!faculty) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se encontró la facultad .`,
        });
      }

      return faculty;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async create(createFacultyDto: CreateFacultyDto): Promise<Faculty> {
    try {
      const existingFaculty = await this.facultyRepository.findByName(
        createFacultyDto.name,
      );

      if (existingFaculty) {
        throw new ErrorManager({
          type: 'CONFLICT',
          message: `Ya existe una facultad con el nombre "${createFacultyDto.name}"`,
        });
      }

      const status = await this.statusRepository.findById(
        createFacultyDto.statusId,
      );

      if (!status) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: 'No se encontró el estado',
        });
      }

      const faculty = new Faculty();

      faculty.name = createFacultyDto.name;
      faculty.department = createFacultyDto.department;
      faculty.email = createFacultyDto.email;
      faculty.phone = createFacultyDto.phone;
      faculty.status = status;

      return this.facultyRepository.create(faculty);
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async update(
    idFaculty: number,
    updateFacultyDto: UpdateFacultyDto,
  ): Promise<Faculty> {
    try {
      const faculty = await this.findById(idFaculty);

      if (updateFacultyDto.name !== undefined) {
        const existingFaculty = await this.facultyRepository.findByName(
          updateFacultyDto.name,
        );

        if (existingFaculty && existingFaculty.id !== idFaculty) {
          throw new ErrorManager({
            type: 'CONFLICT',
            message: `Ya existe una facultad con el nombre "${updateFacultyDto.name}"`,
          });
        }

        faculty.name = updateFacultyDto.name;
      }

      if (updateFacultyDto.department !== undefined) {
        faculty.department = updateFacultyDto.department;
      }

      if (updateFacultyDto.email !== undefined) {
        faculty.email = updateFacultyDto.email;
      }

      if (updateFacultyDto.phone !== undefined) {
        faculty.phone = updateFacultyDto.phone;
      }

      if (updateFacultyDto.statusId !== undefined) {
        const status = await this.statusRepository.findById(
          updateFacultyDto.statusId,
        );

        if (!status) {
          throw new ErrorManager({
            type: 'NOT_FOUND',
            message: `No se encontró el estado .`,
          });
        }

        faculty.status = status;
      }

      const updatedFaculty = await this.facultyRepository.update(
        idFaculty,
        faculty,
      );

      if (!updatedFaculty) {
        throw new ErrorManager({
          type: 'NOT_FOUND',
          message: `No se pudo actualizar la facultad.`,
        });
      }

      return updatedFaculty;
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }

  async remove(idFaculty: number): Promise<void> {
    try {
      await this.findById(idFaculty);

      await this.facultyRepository.delete(idFaculty);
    } catch (error) {
      if (error instanceof ErrorManager) {
        ErrorManager.createAsignatureError(error.message);
      }

      throw error;
    }
  }
}
