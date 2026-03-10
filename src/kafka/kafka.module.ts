import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { KafkaProducerService } from './kafka.producer.service';
import { KafkaConsumerService } from './kafka.consumer.service';
import { MessagesEsService } from '../messages/elasticsearch/messages-es.service';

@Module({
  imports: [
    ElasticsearchModule.register({
      node: process.env.ELASTICSEARCH_NODE || 'elasticsearch:9200',
    }),
  ],
  providers: [KafkaProducerService, KafkaConsumerService, MessagesEsService],
  exports: [KafkaProducerService, MessagesEsService],
})
export class KafkaModule {}