// src/messages/messages.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { SortOrder } from './dto/get-messages.dto';

const mockMessagesService = {
  create: jest.fn().mockResolvedValue({
    _id: 'msg-001',
    conversationId: 'conv-123',
    senderId: 'user-456',
    content: 'Hello World',
    timestamp: new Date(),
  }),
  findAll: jest.fn().mockResolvedValue({
    data: [
      {
        _id: 'msg-001',
        conversationId: 'conv-123',
        content: 'Hello World',
      },
    ],
    meta: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  }),
  search: jest.fn().mockResolvedValue([
    {
      id: 'msg-001',
      conversationId: 'conv-123',
      content: 'Hello World',
    },
  ]),
};

describe('MessagesController', () => {
  let controller: MessagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: mockMessagesService,  // 👈 mock the entire service
        },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── createMessage ──────────────────────────────────────────────────────────

  describe('createMessage()', () => {
    it('should create a message', async () => {
      const dto = {
        conversationId: 'conv-123',
        senderId: 'user-456',
        content: 'Hello World',
      };

      const result = await controller.createMessage(dto);
      expect(mockMessagesService.create).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('_id', 'msg-001');
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated messages', async () => {
      const result = await controller.findAll('conv-123', {
        page: 1,
        limit: 20,
        sort: SortOrder.DESC,
      });

      expect(mockMessagesService.findAll).toHaveBeenCalledWith('conv-123', {
        page: 1,
        limit: 20,
        sort: SortOrder.DESC,
      });
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });
  });

  // ── search ─────────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('should return search results', async () => {
      const result = await controller.search('conv-123', 'hello');

      expect(mockMessagesService.search).toHaveBeenCalledWith('conv-123', 'hello');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});