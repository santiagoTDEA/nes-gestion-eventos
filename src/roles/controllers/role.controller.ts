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
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '../entities/role.entity';
import { CreateRoleDto, UpdateRoleDto } from '../dto/create-role.dto/role.dto';
import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { RequirePermission } from '../../auth/decorators/permission/permission.decorator';
@ApiBearerAuth('access-token')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermission(Module.ROLES, Action.CREAR)
  @Post()
  async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.rolesService.create(createRoleDto);
  }

  @RequirePermission(Module.ROLES, Action.VER, { isCatalog: true })
  @Get()
  async findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }

  @RequirePermission(Module.ROLES, Action.VER, { isCatalog: true })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Role> {
    return this.rolesService.findOne(id);
  }

  @RequirePermission(Module.ROLES, Action.EDITAR)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    return this.rolesService.update(id, updateRoleDto);
  }

  @RequirePermission(Module.ROLES, Action.ELIMINAR)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.rolesService.remove(id);
  }
}
