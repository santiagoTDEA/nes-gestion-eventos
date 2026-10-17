import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';
import { DiffusionController } from './controllers/diffusion.controller';
import { DiffusionAsset } from './entities/diffusion-asset.entity';
import { DiffusionRequest } from './entities/diffusion-request.entity';
import { DiffusionStatusHistory } from './entities/diffusion-status-history.entity';
import { DiffusionService } from './services/diffusion.service';
import { FileStorage, LocalFileStorage } from './storage/file-storage';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DiffusionRequest,
      DiffusionAsset,
      DiffusionStatusHistory,
    ]),
    NotificationsModule,
  ],
  controllers: [DiffusionController],
  providers: [
    DiffusionService,
    { provide: FileStorage, useClass: LocalFileStorage },
  ],
  exports: [DiffusionService],
})
export class DiffusionModule {}
