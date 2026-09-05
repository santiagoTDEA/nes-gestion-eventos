import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Status } from '../entities/state.entity';
@Injectable()
export class StatusRepository {
    constructor(
        @InjectRepository(Status)
        private readonly repository: Repository<Status>,
    ) { }

    async findAll(): Promise<Status[]> {
        return this.repository.find();
    }

    async findById(idStatus: number): Promise<Status | null> {
        return this.repository.findOne({
            where: { idStatus },
        });
    }

    async findByName(statusName: string): Promise<Status | null> {
        return this.repository.findOne({
            where: { statusName },
        });
    }

    async create(status: Status): Promise<Status> {
        return this.repository.save(status);
    }

    async update(status: Status): Promise<Status> {
        return this.repository.save(status);
    }

    async delete(idStatus: number): Promise<void> {
        await this.repository.delete(idStatus);
    }
}