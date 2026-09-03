import { Injectable } from '@nestjs/common';
import { RoleRepository } from '../repositories/role.repository';
import { Role } from '../entities/role.entity';
import { CreateRoleDto, UpdateRoleDto } from '../dto/create-role.dto/role.dto';
import { ErrorManager } from '../../utils/error.manager';


@Injectable()
export class RolesService {
    constructor(
        private readonly roleRepository: RoleRepository,
    ) { }

    async create(createRoleDto: CreateRoleDto): Promise<Role> {
        try {
            const existingRole = await this.roleRepository.findByName(
                createRoleDto.name,
            );

            if (existingRole) {
                throw new ErrorManager({
                    type: 'CONFLICT',
                    message: `Ya existe un rol con el nombre "${createRoleDto.name}"`,
                });
            }

            const roleCreated = Role.create(createRoleDto);

            return await this.roleRepository.create(roleCreated);
        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }

    async findAll(): Promise<Role[]> {
        try {
            return await this.roleRepository.findAll();
        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }

    async findOne(id: string): Promise<Role> {
        try {
            const role = await this.roleRepository.findById(id);

            if (!role) {
                throw new ErrorManager({
                    type: 'NOT_FOUND',
                    message: `No se encontró el rol con ID "${id}"`,
                });
            }

            return role;
        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }

    async update(
        id: string,
        updateRoleDto: UpdateRoleDto,
    ): Promise<Role> {
        try {
            const role = await this.roleRepository.findById(id);

            if (!role) {
                throw new ErrorManager({
                    type: 'NOT_FOUND',
                    message: `No se encontró el rol con ID "${id}"`,
                });
            }

            if (updateRoleDto.name !== undefined) {
                const existingRole = await this.roleRepository.findByName(
                    updateRoleDto.name,
                );


                if (existingRole?.id !== id) {
                    throw new ErrorManager({
                        type: 'CONFLICT',
                        message: `Ya existe un rol con el nombre "${updateRoleDto.name}"`,
                    });
                }
            }

            role.update(updateRoleDto);

            return await this.roleRepository.update(role);
        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }

    async remove(id: string): Promise<void> {
        try {
            const role = await this.roleRepository.findById(id);

            if (!role) {
                throw new ErrorManager({
                    type: 'NOT_FOUND',
                    message: `No se encontró el rol con ID "${id}"`,
                });
            }

            await this.roleRepository.delete(role);
        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }
}