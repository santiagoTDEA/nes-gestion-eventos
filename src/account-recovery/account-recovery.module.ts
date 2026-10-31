import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../auth/entities/auth.entity';
import { MailModule } from '../mail/mail.module';
import { AccountRecoveryController } from './controllers/account-recovery.controller';
import { PasswordRecovery } from './entities/password-recovery.entity';
import { AccountRecoveryService } from './services/account-recovery.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordRecovery]),
    // Límite por IP; cada endpoint ajusta el suyo con @Throttle.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 10 }]),
    MailModule,
  ],
  controllers: [AccountRecoveryController],
  providers: [AccountRecoveryService],
})
export class AccountRecoveryModule {}
