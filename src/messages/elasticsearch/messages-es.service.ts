// src/messages/elasticsearch/messages-es.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

export const MESSAGE_INDEX = 'messages';

@Injectable()
export class MessagesEsService implements OnModuleInit {
  private readonly logger = new Logger(MessagesEsService.name);

  constructor(private readonly esService: ElasticsearchService) {}

  // auto-create index when app starts
  async onModuleInit() {
    await this.createIndexIfNotExists();
  }

  private async createIndexIfNotExists() {
    const exists = await this.esService.indices.exists({
      index: MESSAGE_INDEX,
    });

    if (!exists) {
      await this.esService.indices.create({
        index: MESSAGE_INDEX,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
        },
        mappings: {
          properties: {
            id:             { type: 'keyword' },
            conversationId: { type: 'keyword' },
            senderId:       { type: 'keyword' },
            content:        { type: 'text', analyzer: 'standard' },
            timestamp:      { type: 'date' },
            metadata:       { type: 'object', dynamic: true },
          },
        },
      });
      this.logger.log(`Index "${MESSAGE_INDEX}" created`);
    }
  }

  // called by Kafka consumer
  async indexMessage(message: any) {
    await this.esService.index({
      index: MESSAGE_INDEX,
      id: message.id,
      document: {
        id:             message.id,
        conversationId: message.conversationId,
        senderId:       message.senderId,
        content:        message.content,
        timestamp:      message.timestamp,
        metadata:       message.metadata ?? {},
      },
    });
    this.logger.log(`Indexed message: ${message.id}`);
  }

  // full-text search
  async searchMessages(conversationId: string, query: string) {
    const result = await this.esService.search({
      index: MESSAGE_INDEX,
      query: {
        bool: {
          filter: [{ term: { conversationId } }],  // must match conversation
          must:   [{ match: { content: { query, fuzziness: 'AUTO' } } }],  // search content
        },
      },
      sort: [{ timestamp: { order: 'desc' } }],
    });

    return result.hits.hits.map(hit => hit._source);
  }
}