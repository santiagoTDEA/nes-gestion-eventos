import { Test, TestingModule } from '@nestjs/testing';
import { PersonService } from './person.service';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('PersonService', () => {
  let service: PersonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonService],
    }).compile();

    service = module.get<PersonService>(PersonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
