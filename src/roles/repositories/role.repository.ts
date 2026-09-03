import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '../entities/role.entity';

@Injectable()
export class RoleRepository {
    constructor(
        @InjectRepository(Role)
        private readonly repository: Repository<Role>,
    ) { }

    async create(role: Role): Promise<Role> {
        return this.repository.save(role);
    }

    async findAll(): Promise<Role[]> {
        return this.repository.find({
            order: {
                name: 'ASC',
            },
        });
    }

    async findById(id: string): Promise<Role | null> {
        return this.repository.findOne({
            where: {
                id,
            },
        });
    }

    async findByName(name: string): Promise<Role | null> {
        return this.repository.findOne({
            where: {
                name,
            },
        });
    }
    async update(role: Role): Promise<Role> {
        return this.repository.save(role);
    }

    async delete(role: Role): Promise<void> {
        await this.repository.remove(role);
    }
}