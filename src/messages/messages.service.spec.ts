// src/messages/messages.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MessagesService } from './messages.service';
import { Message } from './schemas/message.schema';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { MessagesEsService } from './elasticsearch/messages-es.service';
import { SortOrder } from './dto/get-messages.dto';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockMessage = {
  _id: 'msg-001',
  conversationId: 'conv-123',
  senderId: 'user-456',
  content: 'Hello World',
  timestamp: new Date(),
  metadata: {},
  save: jest.fn().mockResolvedValue({
    _id: 'msg-001',
    conversationId: 'conv-123',
    senderId: 'user-456',
    content: 'Hello World',
    timestamp: new Date(),
  }),
};


const mockMessageModel = jest.fn().mockImplementation(() => mockMessage);

mockMessageModel.find = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([mockMessage]),
});

mockMessageModel.countDocuments = jest.fn().mockResolvedValue(1);

const mockKafkaProducer = {
  publishMessageCreated: jest.fn().mockResolvedValue(undefined),
};

const mockEsService = {
  searchMessages: jest.fn().mockResolvedValue([mockMessage]),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MessagesService', () => {
  let service: MessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
        {
          provide: KafkaProducerService,
          useValue: mockKafkaProducer,
        },
        {
          provide: MessagesEsService,
          useValue: mockEsService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should save message to MongoDB', async () => {
      const dto = {
        conversationId: 'conv-123',
        senderId: 'user-456',
        content: 'Hello World',
      };

      await service.create(dto);
      expect(mockMessage.save).toHaveBeenCalled();
    });

    it('should publish event to Kafka after saving', async () => {
      const dto = {
        conversationId: 'conv-123',
        senderId: 'user-456',
        content: 'Hello World',
      };

      await service.create(dto);
      expect(mockKafkaProducer.publishMessageCreated).toHaveBeenCalled();
    });

    it('should return saved message', async () => {
      const dto = {
        conversationId: 'conv-123',
        senderId: 'user-456',
        content: 'Hello World',
      };

      const result = await service.create(dto);
      expect(result).toHaveProperty('conversationId', 'conv-123');
      expect(result).toHaveProperty('content', 'Hello World');
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated messages', async () => {
      const result = await service.findAll('conv-123', {
        page: 1,
        limit: 20,
        sort: SortOrder.DESC,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('total', 1);
      expect(result.meta).toHaveProperty('page', 1);
      expect(result.meta).toHaveProperty('totalPages', 1);
    });

    it('should query correct conversationId', async () => {
      await service.findAll('conv-123', { page: 1, limit: 20 });
      expect(mockMessageModel.find).toHaveBeenCalledWith({
        conversationId: 'conv-123',
      });
    });

    it('should calculate hasNextPage correctly', async () => {
      mockMessageModel.countDocuments.mockResolvedValueOnce(50);

      const result = await service.findAll('conv-123', {
        page: 1,
        limit: 20,
      });

      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should return hasPrevPage false on first page', async () => {
      const result = await service.findAll('conv-123', { page: 1, limit: 20 });
      expect(result.meta.hasPrevPage).toBe(false);
    });
  });

  // ── search ──────────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('should call elasticsearch searchMessages', async () => {
      await service.search('conv-123', 'hello');
      expect(mockEsService.searchMessages).toHaveBeenCalledWith(
        'conv-123',
        'hello',
      );
    });

    it('should return empty array for empty query', async () => {
      const result = await service.search('conv-123', '');
      expect(result).toEqual([]);
    });

    it('should return search results', async () => {
      const result = await service.search('conv-123', 'hello');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});