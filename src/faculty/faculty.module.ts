import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FacultyRepository } from './repository/faculty.repository';
import { FacultyService } from './services/faculty.service';
import { Faculty } from './entities/faculty.entity';
import { FacultyController } from './controllers/faculty.controller';

import { StateModule } from '../state/state.module';

@Module({
  imports: [TypeOrmModule.forFeature([Faculty]), StateModule],
  controllers: [FacultyController],
  providers: [FacultyRepository, FacultyService],
  exports: [FacultyService, FacultyRepository],
})
export class FacultyModule {}
