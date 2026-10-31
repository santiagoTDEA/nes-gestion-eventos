import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Event } from '../events/entities/event.entity';
import { EventRegistration } from '../registrations/entities/event-registration.entity';
import { CertificateController } from './controllers/certificate.controller';
import { CertificateService } from './services/certificate.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventRegistration])],
  controllers: [CertificateController],
  providers: [CertificateService],
})
export class CertificatesModule {}
