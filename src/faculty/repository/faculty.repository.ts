import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Faculty } from '../entities/faculty.entity';

@Injectable()
export class FacultyRepository {

    constructor(
        @InjectRepository(Faculty)
        private readonly repository: Repository<Faculty>,
    ) { }

    async create(faculty: Faculty): Promise<Faculty> {
        const savedFaculty = await this.repository.save(faculty);

        return await this.findById(savedFaculty.id) as Faculty;
    }

    async findAll(): Promise<Faculty[]> {
        return await this.repository.find({
            relations: {
                status: true,
                persons: {
                    status: true,
                },
            },
        });
    }

    async findById(id: number): Promise<Faculty | null> {
        return await this.repository.findOne({
            where: { id },
            relations: {
                status: true,
                persons: {
                    status: true,
                },
            },
        });
    }

    async findByName(name: string): Promise<Faculty | null> {
        return await this.repository.findOne({
            where: { name },
            relations: {
                status: true,
                persons: {
                    status: true,
                },
            },
        });
    }

    async update(
        id: number,
        faculty: Partial<Faculty>,
    ): Promise<Faculty | null> {

        await this.repository.update(id, faculty);

        return await this.findById(id);
    }

    async delete(id: number): Promise<void> {
        await this.repository.delete(id);
    }
}