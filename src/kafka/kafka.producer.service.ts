import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, Admin } from 'kafkajs';
import { kafkaConfig, KAFKA_TOPICS, KAFKA_GROUPS } from '../config/kafka.config';
import { Message } from '../messages/schemas/message.schema';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: Producer;
  private admin: Admin;
  private kafka = new Kafka(kafkaConfig);

  async onModuleInit() {
    // setup admin to create topics
    this.admin = this.kafka.admin();
    await this.admin.connect();
    await this.createTopics();

    // setup producer
    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
  }

  private async createTopics() {
    const existingTopics = await this.admin.listTopics();

    if (!existingTopics.includes(KAFKA_TOPICS.MESSAGE_CREATED)) {
      await this.admin.createTopics({
        topics: [
          {
            topic: KAFKA_TOPICS.MESSAGE_CREATED,
            numPartitions: 3,       // 3 partitions for parallelism
            replicationFactor: 1,   // 1 for single broker (increase for prod)
            configEntries: [
              { name: 'retention.ms', value: '604800000' }, // 7 days retention
              { name: 'cleanup.policy', value: 'delete' },
            ],
          },
        ],
      });
      this.logger.log(`Topic "${KAFKA_TOPICS.MESSAGE_CREATED}" created with 3 partitions`);
    } else {
      this.logger.log(`Topic "${KAFKA_TOPICS.MESSAGE_CREATED}" already exists`);
    }

    await this.admin.disconnect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async publishMessageCreated(message: Message) {
    await this.producer.send({
      topic: KAFKA_TOPICS.MESSAGE_CREATED,
      messages: [
        {
          key: message.conversationId,  // same conversation → same partition → ordered
          value: JSON.stringify({
            id: message._id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            content: message.content,
            timestamp: message.timestamp,
            metadata: message.metadata,
          }),
        },
      ],
    });
    this.logger.log(`Event published: ${KAFKA_TOPICS.MESSAGE_CREATED}`);
  }
}
