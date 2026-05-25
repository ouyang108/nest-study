import { Test, TestingModule } from '@nestjs/testing';
import { ChatioService } from './chatio.service';

describe('ChatioService', () => {
  let service: ChatioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatioService],
    }).compile();

    service = module.get<ChatioService>(ChatioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
