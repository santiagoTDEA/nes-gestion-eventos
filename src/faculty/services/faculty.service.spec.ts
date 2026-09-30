import { Test, TestingModule } from '@nestjs/testing';
import { FacultyService } from './faculty.service';
import { describe, beforeEach, it, expect } from '@jest/globals';

describe('FacultyService', () => {
  let service: FacultyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FacultyService],
    }).compile();

    service = module.get<FacultyService>(FacultyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
