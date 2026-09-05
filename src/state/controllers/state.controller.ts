import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateStatusDto } from '../dto/state.dto';
import { Status } from '../entities/state.entity';
import { StatusService } from '../services/state.service';
import { Action } from '../../auth/constants/action.enum';
import { Module } from '../../auth/constants/module.enum';
import { RequirePermission } from '../../auth/decorators/permission/permission.decorator';

@Controller('statuses')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @RequirePermission(Module.GESTION_EVENTOS, Action.VER)
  @Get()
  async findAll(): Promise<Status[]> {
    return this.statusService.findAll();
  }

  @RequirePermission(Module.GESTION_EVENTOS, Action.VER)
  @Get(':idStatus')
  async findById(
    @Param('idStatus', ParseIntPipe) idStatus: number,
  ): Promise<Status> {
    return this.statusService.findById(idStatus);
  }

  @RequirePermission(Module.GESTION_EVENTOS, Action.CREAR)
  @Post()
  async create(@Body() createStatusDto: CreateStatusDto): Promise<Status> {
    return this.statusService.create(createStatusDto);
  }

  @RequirePermission(Module.GESTION_EVENTOS, Action.ELIMINAR)
  @Delete(':idStatus')
  async remove(
    @Param('idStatus', ParseIntPipe) idStatus: number,
  ): Promise<void> {
    return this.statusService.remove(idStatus);
  }
}
