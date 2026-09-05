import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

import { PersonRepository } from './repository/person.repository';
import { PersonController } from './controllers/person.controller';
import { Person } from './entities/person.entity';

import { FacultyModule } from '../faculty/faculty.module';
import { StateModule } from '../state/state.module';
import { PersonService } from './services/person.service';
import { RoleModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Person]),
    FacultyModule,
    StateModule,
    RoleModule,
  ],
  controllers: [PersonController],
  providers: [PersonRepository, PersonService],
  exports: [PersonService, PersonRepository],
})
export class PersonModule {}
