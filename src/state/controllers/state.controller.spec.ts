import { Test, TestingModule } from '@nestjs/testing';
import { StatusController } from './state.controller';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('StatusController', () => {
  let controller: StatusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatusController],
    }).compile();

    controller = module.get<StatusController>(StatusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
