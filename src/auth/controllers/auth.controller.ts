import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UserService } from '../services/auth.service';
import { User } from '../entities/auth.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  ValidarCredencialesDto,
} from '../dto/auth.dto';
import { Action } from '../constants/action.enum';
import { Module } from '../constants/module.enum';
import { RequirePermission } from '../decorators/permission/permission.decorator';
import { Public } from '../decorators/public/public.decorator';

@ApiTags('Autenticación')
@Controller('auth')
export class UserController {
  constructor(private readonly authService: UserService) {}

  @Public()
  @Post('validate-credentials')
  @ApiOperation({
    summary: 'Validar las credenciales de un usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Credenciales validadas correctamente',
    type: Object,
  })
  async validateCredentials(
    @Body() validarCredenciales: ValidarCredencialesDto,
  ): Promise<{ accessToken: string }> {
    const { username, password } = validarCredenciales;
    return this.authService.validateCredentials(username, password);
  }
  @ApiBearerAuth('access-token')
  @Get('users')
  @ApiOperation({
    summary: 'Obtener todos los usuarios',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuarios obtenidos correctamente',
    type: [User],
  })
  @RequirePermission(Module.GESTION_EVENTOS, Action.VER)
  async findAll(): Promise<User[]> {
    return this.authService.findAll();
  }

  @Get('users/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Obtener un usuario por ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado correctamente',
    type: User,
  })
  @RequirePermission(Module.GESTION_EVENTOS, Action.VER)
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.authService.findById(id);
  }

  @Public()
  @Post('users')
  @ApiOperation({
    summary: 'Crear un usuario',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado correctamente',
    type: User,
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.authService.create(createUserDto);
  }

  @ApiBearerAuth('access-token')
  @RequirePermission(Module.GESTION_EVENTOS, Action.VER)
  @Patch('users/:id')
  @ApiOperation({
    summary: 'Actualizar un usuario',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado correctamente',
    type: User,
  })
  @RequirePermission(Module.GESTION_EVENTOS, Action.EDITAR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.authService.update(id, updateUserDto);
  }

  @ApiBearerAuth('access-token')
  @RequirePermission(Module.GESTION_EVENTOS, Action.ELIMINAR)
  @Delete('users/:id')
  @ApiOperation({
    summary: 'Eliminar un usuario',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado correctamente',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.authService.remove(id);

    return {
      message: 'Usuario eliminado correctamente',
    };
  }
}
