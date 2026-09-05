import { Injectable } from '@nestjs/common';
import { PersonRepository } from '../../person/repository/person.repository';

import { User } from '../entities/auth.entity';
import { StatusRepository } from '../../state/repositories/state.repository';
import { ErrorManager } from '../../utils/error.manager';
import { UserRepository } from '../repository/auth.repository';
import { CreateUserDto, UpdateUserDto } from '../dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class UserService {

    constructor(
        private readonly userRepository: UserRepository,
        private readonly statusRepository: StatusRepository,
        private readonly personRepository: PersonRepository,
        private readonly jwtService: JwtService,
    ) { }

    async findAll(): Promise<User[]> {
        try {
            return await this.userRepository.findAll();
        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }

    async findById(id: string): Promise<User> {
        try {
            const user =
                await this.userRepository.findById(id);

            if (!user) {
                throw new ErrorManager({
                    type: 'NOT_FOUND',
                    message: `No se encontró el usuario.`,
                });
            }

            return user;
        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }


    async validateCredentials(
        username: string,
        password: string,
    ): Promise<{ accessToken: string }> {
        try {
            const user =
                await this.userRepository.validateCredentials(username, password);
            if (!user) {
                throw new ErrorManager({
                    type: 'NOT_FOUND',
                    message: `No se encontró el usuario con las credenciales proporcionadas`,
                });


            } else if (user.status.statusName.toLocaleLowerCase().trim() === "inactivo") {
                throw new ErrorManager({
                    type: 'FORBIDDEN',
                    message: `El usuario con las credenciales proporcionadas está inactivo`,
                });
            }

            if (!user.person?.role) {
                throw new ErrorManager({
                    type: 'NOT_FOUND',
                    message: `hay un problema con la información de rol del usuario`,
                });
            }

            const payload = {
                sub: user.id,
                username: user.username,
                role: {
                    id: user.person.role.id,
                    name: user.person.role.name,
                    permissionsFull: user.person.role.permissionsFull,
                    modulesFull: user.person.role.modulesFull,
                    accesos: user.person.role.accesos
                },
                status: user.status.statusName,
            };


            const accessToken = await this.jwtService.signAsync(payload);

            return {
                accessToken,
            };
        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }


    async create(
        createUserDto: CreateUserDto,
    ): Promise<User> {
        try {

            const existingUser =
                await this.userRepository.findByUsername(
                    createUserDto.username,
                );

            if (existingUser) {
                throw new ErrorManager({
                    type: 'CONFLICT',
                    message: `Ya existe un usuario con el nombre "${createUserDto.username}"`,
                });
            }

            const status =
                await this.statusRepository.findById(
                    createUserDto.statusId,
                );

            if (!status) {
                throw new ErrorManager({
                    type: 'NOT_FOUND',
                    message: `No se encontró el estado .`,
                });
            }

            const user = new User();


            if (createUserDto.personId) {

                const newpersona = (await this.personRepository.findById(
                    createUserDto.personId,
                ))

                if (!newpersona) {
                    throw new ErrorManager({
                        type: 'NOT_FOUND',
                        message: `No se encontró la persona `,
                    });
                }

                user.person = newpersona;

            }


            user.username = createUserDto.username;
            user.password = createUserDto.password;
            user.status = status;
            return await this.userRepository.create(user);

        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }

    async update(
        id: string,
        updateUserDto: UpdateUserDto,
    ): Promise<User> {
        try {
            const user = await this.findById(id);

            if (updateUserDto.username !== undefined) {
                const existingUser =
                    await this.userRepository.findByUsername(
                        updateUserDto.username,
                    );

                if (
                    existingUser &&
                    existingUser.id !== id
                ) {
                    throw new ErrorManager({
                        type: 'CONFLICT',
                        message: `Ya existe un usuario con el nombre "${updateUserDto.username}"`,
                    });
                }

                user.username = updateUserDto.username;
            }

            if (updateUserDto.password !== undefined) {
                user.password = updateUserDto.password;
            }

            if (updateUserDto.statusId !== undefined) {
                const status =
                    await this.statusRepository.findById(
                        updateUserDto.statusId,
                    );

                if (!status) {
                    throw new ErrorManager({
                        type: 'NOT_FOUND',
                        message: `No se encontró el estado.`,
                    });
                }

                user.status = status;
            }

            if (updateUserDto.personId !== undefined) {
                const newPersona =
                    await this.personRepository.findById(
                        updateUserDto.personId,
                    );

                if (!newPersona) {
                    throw new ErrorManager({
                        type: 'NOT_FOUND',
                        message: `No se encontró la persona.`,
                    });
                }

                if (newPersona.status.idStatus !== 1) {
                    throw new ErrorManager({
                        type: 'FORBIDDEN',
                        message: 'No se puede asignar una persona inactiva al usuario',
                    });
                }

                user.person = newPersona;
            }

            const updatedUser =
                await this.userRepository.update(
                    id,
                    user,
                );

            if (!updatedUser) {
                throw new ErrorManager({
                    type: 'NOT_FOUND',
                    message: `No se pudo actualizar el usuario.`,
                });
            }

            return updatedUser;

        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }

    async remove(id: string): Promise<void> {
        try {
            await this.findById(id);

            await this.userRepository.delete(id);

        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }
}

