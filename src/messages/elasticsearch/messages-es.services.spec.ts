// src/messages/elasticsearch/messages-es.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MessagesEsService, MESSAGE_INDEX } from './messages-es.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';

const mockEsClient = {
  indices: {
    exists: jest.fn().mockResolvedValue(false),
    create: jest.fn().mockResolvedValue({}),
  },
  index: jest.fn().mockResolvedValue({}),
  search: jest.fn().mockResolvedValue({
    hits: {
      hits: [
        {
          _source: {
            id: 'msg-001',
            conversationId: 'conv-123',
            content: 'Hello World',
          },
          _score: 1.5,
          highlight: { content: ['<em>Hello</em> World'] },
        },
      ],
    },
  }),
};

describe('MessagesEsService', () => {
  let service: MessagesEsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesEsService,
        { provide: ElasticsearchService, useValue: mockEsClient },
      ],
    }).compile();

    service = module.get<MessagesEsService>(MessagesEsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── onModuleInit ─────────────────────────────────────────────────────────

  describe('onModuleInit()', () => {
    it('should create index if not exists', async () => {
      mockEsClient.indices.exists.mockResolvedValueOnce(false);
      await service.onModuleInit();
      expect(mockEsClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: MESSAGE_INDEX }),
      );
    });

    it('should not create index if already exists', async () => {
      mockEsClient.indices.exists.mockResolvedValueOnce(true);
      await service.onModuleInit();
      expect(mockEsClient.indices.create).not.toHaveBeenCalled();
    });
  });

  // ── indexMessage ─────────────────────────────────────────────────────────

  describe('indexMessage()', () => {
    it('should index message into elasticsearch', async () => {
      const message = {
        id: 'msg-001',
        conversationId: 'conv-123',
        senderId: 'user-456',
        content: 'Hello World',
        timestamp: new Date(),
        metadata: {},
      };

      await service.indexMessage(message);
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: MESSAGE_INDEX,
          id: 'msg-001',
        }),
      );
    });
  });

  // ── searchMessages ───────────────────────────────────────────────────────

  describe('searchMessages()', () => {
    it('should search messages by conversationId and query', async () => {
      const result = await service.searchMessages('conv-123', 'hello');
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: MESSAGE_INDEX }),
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return matched documents', async () => {
      const result = await service.searchMessages('conv-123', 'hello');
      expect(result[0]).toHaveProperty('id', 'msg-001');
      expect(result[0]).toHaveProperty('content', 'Hello World');
    });
  });
});