// src/kafka/kafka.consumer.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { kafkaConfig, KAFKA_TOPICS, KAFKA_GROUPS } from '../config/kafka.config';
import { MessagesEsService } from '../messages/elasticsearch/messages-es.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumer: Consumer;

  private kafka = new Kafka(kafkaConfig);

  constructor(private readonly messagesEsService: MessagesEsService) {}

  async onModuleInit() {
    this.consumer = this.kafka.consumer({
      groupId: KAFKA_GROUPS.ES_INDEXER,  // consumer group
    });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: KAFKA_TOPICS.MESSAGE_CREATED,
      fromBeginning: false,  // only process new messages
    });

    await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (!message.value) return;  // 👈 add this
      
            const payload = JSON.parse(message.value.toString());
            this.logger.log(`Consumed from partition ${partition}: ${payload.id}`);
      
            await this.messagesEsService.indexMessage(payload);
      
          } catch (error) {
            this.logger.error(`Failed to process message: ${error.message}`);
          }
        },
    });

    this.logger.log('Kafka consumer connected and listening...');
  }

  

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}