import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Event } from './entities/event.entity';
import { EventApproval } from './entities/event-approval.entity';
import { EventObservation } from './entities/event-observation.entity';
import { EventRepository } from './repository/event.repository';
import { EventService } from './services/event.service';
import { EventNotifier } from './services/event-notifier.service';
import { EventController } from './controllers/event.controller';

import { FacultyModule } from '../faculty/faculty.module';
import { PersonModule } from '../person/person.module';
import { RoleModule } from '../roles/roles.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DiffusionModule } from '../diffusion/diffusion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventApproval, EventObservation]),
    FacultyModule,
    PersonModule,
    RoleModule,
    NotificationsModule,
    DiffusionModule,
  ],
  controllers: [EventController],
  providers: [EventRepository, EventService, EventNotifier],
  exports: [EventService, EventRepository],
})
export class EventsModule {}
