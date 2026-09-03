import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { RolesService } from './services/roles.service';
import { RolesController } from './controllers/role.controller';
import { RoleRepository } from './repositories/role.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Role])],
    providers: [RolesService, RoleRepository],
    exports: [RolesService],
    controllers: [RolesController],
})
export class RolesModule { }
