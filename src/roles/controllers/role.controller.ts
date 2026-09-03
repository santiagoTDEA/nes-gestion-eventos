import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { RolesService } from '../services/roles.service';


import { Role } from '../entities/role.entity';
import { CreateRoleDto, UpdateRoleDto } from '../dto/create-role.dto/role.dto';
@Controller('roles')
export class RolesController {
    constructor(
        private readonly rolesService: RolesService,
    ) { }

    @Post()
    async create(
        @Body() createRoleDto: CreateRoleDto,
    ): Promise<Role> {
        return this.rolesService.create(createRoleDto);
    }

    @Get()
    async findAll(): Promise<Role[]> {
        return this.rolesService.findAll();
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
    ): Promise<Role> {
        return this.rolesService.findOne(id);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateRoleDto: UpdateRoleDto,
    ): Promise<Role> {
        return this.rolesService.update(id, updateRoleDto);
    }

    @Delete(':id')
    async remove(
        @Param('id') id: string,
    ): Promise<void> {
        return this.rolesService.remove(id);
    }
}