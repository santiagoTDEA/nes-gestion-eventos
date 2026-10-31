import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Event } from '../events/entities/event.entity';
import { RegistrationController } from './controllers/registration.controller';
import { EventRegistration } from './entities/event-registration.entity';
import { RegistrationExcelService } from './services/registration-excel.service';
import { RegistrationService } from './services/registration.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventRegistration, Event])],
  controllers: [RegistrationController],
  providers: [RegistrationService, RegistrationExcelService],
  exports: [RegistrationService],
})
export class RegistrationsModule {}
