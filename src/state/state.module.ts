import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Status } from './entities/state.entity';
import { StatusRepository } from './repositories/state.repository';
import { StatusController } from './controllers/state.controller';
import { StatusService } from './services/state.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Status]),
    ],
    controllers: [
        StatusController,
    ],
    providers: [
        StatusRepository,
        StatusService,
    ],
    exports: [
        StatusRepository,
        StatusService,
    ],
})
export class StateModule {}