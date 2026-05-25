import { Test, TestingModule } from '@nestjs/testing';
import { ChatioGateway } from './chatio.gateway';
import { ChatioService } from './chatio.service';

describe('ChatioGateway', () => {
  let gateway: ChatioGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatioGateway, ChatioService],
    }).compile();

    gateway = module.get<ChatioGateway>(ChatioGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
