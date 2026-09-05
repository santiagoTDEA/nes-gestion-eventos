import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post
} from '@nestjs/common';

import {
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import { Faculty } from '../entities/faculty.entity';
import {
    CreateFacultyDto,
    UpdateFacultyDto,
} from '../dto/faculty.dto';
import { FacultyService } from '../services/faculty.service';
import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { RequirePermission } from '../../auth/decorators/permission/permission.decorator';

@ApiTags('Facultades')
@Controller('faculties')


export class FacultyController {

    constructor(
        private readonly facultyService: FacultyService,
    ) { }

    @RequirePermission(
        Module.GESTION_EVENTOS,
        Action.VER,
    )
    @Get()
    @ApiOperation({
        summary: 'Obtener todas las facultades',
    })
    @ApiResponse({
        status: 200,
        description: 'Facultades obtenidas correctamente',
        type: [Faculty],
    })
    async findAll(): Promise<Faculty[]> {
        return this.facultyService.findAll();
    }

    @RequirePermission(
        Module.GESTION_EVENTOS,
        Action.VER,
    )
    @Get(':id')
    @ApiOperation({
        summary: 'Obtener una facultad por ID',
    })
    @ApiParam({
        name: 'id',
        description: 'Identificador único de la facultad',
        example: 1,
    })
    @ApiResponse({
        status: 200,
        description: 'Facultad encontrada correctamente',
        type: Faculty,
    })
    async findById(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<Faculty> {
        return this.facultyService.findById(id);
    }

    @RequirePermission(
        Module.GESTION_EVENTOS,
        Action.CREAR,
    )
    @Post()
    @ApiOperation({
        summary: 'Crear una facultad',
    })
    @ApiResponse({
        status: 201,
        description: 'Facultad creada correctamente',
        type: Faculty,
    })
    async create(
        @Body() createFacultyDto: CreateFacultyDto,
    ): Promise<Faculty> {
        return this.facultyService.create(createFacultyDto);
    }

    @RequirePermission(
        Module.GESTION_EVENTOS,
        Action.EDITAR,
    )
    @Patch(':id')
    @ApiOperation({
        summary: 'Actualizar una facultad',
    })
    @ApiParam({
        name: 'id',
        description: 'Identificador único de la facultad',
        example: 1,
    })
    @ApiResponse({
        status: 200,
        description: 'Facultad actualizada correctamente',
        type: Faculty,
    })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateFacultyDto: UpdateFacultyDto,
    ): Promise<Faculty> {
        return this.facultyService.update(
            id,
            updateFacultyDto,
        );
    }

    @RequirePermission(
        Module.GESTION_EVENTOS,
        Action.ELIMINAR,
    )
    @Delete(':id')
    @ApiOperation({
        summary: 'Eliminar una facultad',
    })
    @ApiParam({
        name: 'id',
        description: 'Identificador único de la facultad',
        example: 1,
    })
    @ApiResponse({
        status: 200,
        description: 'Facultad eliminada correctamente',
    })
    async remove(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<{ message: string }> {

        await this.facultyService.remove(id);

        return {
            message: 'Facultad eliminada correctamente',
        };
    }
}