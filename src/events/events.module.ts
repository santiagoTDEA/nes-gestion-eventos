import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacultyModule } from '../faculty/faculty.module';
import { PersonModule } from '../person/person.module';
import { RoleModule } from '../roles/roles.module';
import { Event } from './entities/event.entity';
import { EventApproval } from './entities/event-approval.entity';
import { EventObservation } from './entities/event-observation.entity';
import { EventsController } from './controllers/events.controller';
import { EventsService } from './services/events.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventApproval, EventObservation, Faculty]),
    FacultyModule,
    PersonModule,
    RoleModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
