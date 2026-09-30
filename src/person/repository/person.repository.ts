import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Person } from '../entities/person.entity';

@Injectable()
export class PersonRepository {
  constructor(
    @InjectRepository(Person)
    private readonly repository: Repository<Person>,
  ) {}

  async create(person: Person): Promise<Person> {
    return await this.repository.save(person);
  }

  async findAll(): Promise<Person[]> {
    return await this.repository.find({
      relations: {
        faculty: true,
        status: true,
        role: true,
        user: {
          status: true,
        },
      },
    });
  }

  async findById(id: number): Promise<Person | null> {
    return await this.repository.findOne({
      where: { id },
      relations: {
        faculty: true,
        status: true,
        role: true,
        user: {
          status: true,
        },
      },
    });
  }
  async findByIdForUpdate(id: number): Promise<Person | null> {
    return await this.repository.findOne({
      where: { id },
      relations: {
        faculty: true,
        status: true,
        role: true,
        user: false,
      },
    });
  }

  async findByCedula(cedula: string): Promise<Person | null> {
    return await this.repository.findOne({
      where: { cedula },
      relations: {
        faculty: true,
        status: true,
        role: true,
        user: true,
      },
    });
  }

  async update(id: number, person: Partial<Person>): Promise<Person | null> {
    await this.repository.update(id, person);

    return await this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
