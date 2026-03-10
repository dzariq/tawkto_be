// src/config/kafka.config.ts
export const kafkaConfig = {
    clientId: 'messages-app',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  };
  
  export const KAFKA_TOPICS = {
    MESSAGE_CREATED: 'message.created',
  };
  
  export const KAFKA_GROUPS = {
    ES_INDEXER: 'es-indexer-group',  // consumer group for Elasticsearch indexing
  };