import { Test, TestingModule } from '@nestjs/testing';
import { PersonController } from '../controllers/person.controller';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('PersonController', () => {
  let controller: PersonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonController],
    }).compile();

    controller = module.get<PersonController>(PersonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
