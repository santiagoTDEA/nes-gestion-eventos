import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Event } from './entities/event.entity';
import { EventApproval } from './entities/event-approval.entity';
import { EventRepository } from './repository/event.repository';
import { EventService } from './services/event.service';
import { EventController } from './controllers/event.controller';

import { FacultyModule } from '../faculty/faculty.module';
import { PersonModule } from '../person/person.module';
import { RoleModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventApproval]),
    FacultyModule,
    PersonModule,
    RoleModule,
  ],
  controllers: [EventController],
  providers: [EventRepository, EventService],
  exports: [EventService, EventRepository],
})
export class EventsModule {}
