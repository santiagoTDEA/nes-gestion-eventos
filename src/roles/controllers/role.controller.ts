import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post
} from '@nestjs/common';
import { RolesService } from '../services/roles.service';


import { Role } from '../entities/role.entity';
import { CreateRoleDto, UpdateRoleDto } from '../dto/create-role.dto/role.dto';
import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { RequirePermission } from '../../auth/decorators/permission/permission.decorator';
@Controller('roles')


export class RolesController {
    constructor(
        private readonly rolesService: RolesService,
    ) { }

    @RequirePermission(
            Module.GESTION_EVENTOS,
            Action.CREAR,
        )

    @Post()
    async create(
        @Body() createRoleDto: CreateRoleDto,
    ): Promise<Role> {
        return this.rolesService.create(createRoleDto);
    }

    @RequirePermission(
        Module.GESTION_EVENTOS,
        Action.VER,
    )
    @Get()
    async findAll(): Promise<Role[]> {
        return this.rolesService.findAll();
    }

    @RequirePermission(
        Module.GESTION_EVENTOS,
        Action.VER,
    )
    @Get(':id')
    async findOne(
        @Param('id') id: string,
    ): Promise<Role> {
        return this.rolesService.findOne(id);
    }

    @RequirePermission(
        Module.GESTION_EVENTOS,
        Action.EDITAR,
    )
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateRoleDto: UpdateRoleDto,
    ): Promise<Role> {
        return this.rolesService.update(id, updateRoleDto);
    }

    @RequirePermission(
        Module.GESTION_EVENTOS,
        Action.ELIMINAR,
    )
    @Delete(':id')
    async remove(
        @Param('id') id: string,
    ): Promise<void> {
        return this.rolesService.remove(id);
    }
}