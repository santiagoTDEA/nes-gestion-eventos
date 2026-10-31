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
  ChangeOwnPasswordDto,
  CreateUserDto,
  UpdateUserDto,
  ValidarCredencialesDto,
} from '../dto/auth.dto';
import { Action } from '../constants/action.enum';
import { Module } from '../constants/module.enum';
import { RequirePermission } from '../decorators/permission/permission.decorator';
import { Public } from '../decorators/public/public.decorator';
import { CurrentUser } from '../decorators/current-user/current-user.decorator';
import type { AuthUser } from '../interfaces/jwt-payload.interface';
import type { UserProfile } from '../interfaces/user-profile.interface';

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
  @Get('me')
  @ApiOperation({
    summary: 'Obtener el perfil del usuario autenticado (nombre y rol)',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil obtenido correctamente',
    type: Object,
  })
  @RequirePermission(Module.USUARIOS, Action.VER, { isCatalog: true })
  async me(@CurrentUser() user: AuthUser): Promise<UserProfile> {
    return this.authService.getProfile(user.userId);
  }

  @ApiBearerAuth('access-token')
  @Patch('me/password')
  @ApiOperation({
    summary:
      'Cambiar la contraseña del usuario autenticado (pide la contraseña actual)',
  })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({
    status: 400,
    description:
      'Contraseña actual incorrecta, confirmación distinta o contraseña nueva débil',
  })
  @RequirePermission(Module.USUARIOS, Action.EDITAR, { ownAccount: true })
  async changeOwnPassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangeOwnPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changeOwnPassword(user.userId, dto);
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
  @RequirePermission(Module.USUARIOS, Action.VER)
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
  @RequirePermission(Module.USUARIOS, Action.VER)
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.authService.findById(id);
  }

  @RequirePermission(Module.USUARIOS, Action.CREAR)
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
  @RequirePermission(Module.USUARIOS, Action.EDITAR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.authService.update(id, updateUserDto);
  }

  @ApiBearerAuth('access-token')
  @RequirePermission(Module.USUARIOS, Action.ELIMINAR)
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
