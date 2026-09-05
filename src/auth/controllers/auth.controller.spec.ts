import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './auth.controller';
import { describe, beforeEach, it, expect } from '@jest/globals';
describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
