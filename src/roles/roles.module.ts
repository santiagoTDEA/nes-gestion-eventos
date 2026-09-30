import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Role } from './entities/role.entity';
import { RoleRepository } from './repositories/role.repository';
import { RolesService } from './services/roles.service';
import { RolesController } from './controllers/role.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  controllers: [RolesController],
  providers: [RoleRepository, RolesService],
  exports: [RoleRepository, RolesService],
})
export class RoleModule {}
