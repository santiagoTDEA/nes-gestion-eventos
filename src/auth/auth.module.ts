import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/auth.entity';
import { StateModule } from '../state/state.module';
import { UserController } from './controllers/auth.controller';
import { UserService } from './services/auth.service';
import { UserRepository } from './repository/auth.repository';
import { PersonModule } from '../person/person.module';
import { JwtModule } from '@nestjs/jwt';
import { Env } from '../enviroments/models/enviroment.model';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    StateModule,
    PersonModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: Number(
            configService.getOrThrow<number>('EXPIRATION_TIME'),
          ),
        },
      }),
    }),
  ],
  controllers: [UserController],
  providers: [UserRepository, UserService, JwtStrategy],
  exports: [UserService],
})
export class AuthModule {}
