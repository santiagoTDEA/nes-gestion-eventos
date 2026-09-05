import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/auth.entity';

@Injectable()
export class UserRepository {

    constructor(
        @InjectRepository(User)
        private readonly repository: Repository<User>,
    ) { }

    async create(user: User): Promise<User> {
        const savedUser = await this.repository.save(user);

        return await this.findById(savedUser.id) as User;
    }



    async findById(id: string): Promise<User | null> {
        return await this.repository.findOne({
            where: { id },
            relations: {
                status: true,
                person: {
                    status: true,
                },
            },
        });
    }

    async findAll(): Promise<User[]> {
        return await this.repository.find({
            relations: {
                status: true,
                person: {
                    status: true,
                },
            },
        });
    }

    async validateCredentials(
        username: string,
        password: string,
    ): Promise<User | null> {

        const user =
            await this.repository.findOne({
                where: { username },
                relations: {
                    person: {
                        status: true,
                        role: true,
                    },
                    status: true,
                },
            });
        return (user && user.password === password) ? user : null;

    }

    async findByUsername(username: string): Promise<User | null> {
        return await this.repository.findOne({
            where: { username },
            relations: {
                person: true,
                status: true,
            },
        });
    }

    async findByPersonId(idPerson: number): Promise<User | null> {
        return await this.repository.findOne({
            where: {
                person: {
                    id: idPerson,
                },
            },
            relations: {
                person: true,
                status: true,
            },
        });
    }

    async update(
        id: string,
        user: Partial<User>,
    ): Promise<User | null> {
        await this.repository.update(id, user);

        return await this.findById(id);
    }

    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
    }
}