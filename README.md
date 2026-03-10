


Run Tests
bash# run all tests
npm run test

# run with coverage report
npm run test:cov

# run specific file
npm run test messages.service

Expected Output
bashPASS src/messages/messages.service.spec.ts
  MessagesService
    create()
      ✓ should save message to MongoDB
      ✓ should publish event to Kafka after saving
      ✓ should return saved message
    findAll()
      ✓ should return paginated messages
      ✓ should query correct conversationId
      ✓ should calculate hasNextPage correctly
      ✓ should return hasPrevPage false on first page
    search()
      ✓ should call elasticsearch searchMessages
      ✓ should return empty array for empty query
      ✓ should return search results

PASS src/kafka/kafka.producer.service.spec.ts
PASS src/messages/elasticsearch/messages-es.service.spec.ts