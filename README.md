# Messages API

> NestJS + MongoDB + Kafka + Elasticsearch

---

## Prerequisites

- Docker Desktop (v4.0+)
- Node.js (v20+)
- npm (v9+)
- MongoDB Atlas account

---

## 1. Installation & Setup

### Step 1: Clone the repository

```bash
git clone <repository-url>
cd my-app
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Configure environment variables

Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=production

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/messagesdb?appName=<app>

# Kafka
KAFKA_BROKER=kafka:9092
KAFKAJS_NO_PARTITIONER_WARNING=1

# Elasticsearch
ELASTICSEARCH_NODE=http://elasticsearch:9200

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
```

### Step 4: Start all services with Docker

```bash
# Build and start everything
docker-compose up -d --build

# Verify all containers are running
docker ps
```

All services should be running:

| Service       | URL                        | Description        |
|---------------|----------------------------|--------------------|
| NestJS API    | http://localhost:3000      | Main application   |
| Elasticsearch | http://localhost:9200      | Search engine      |
| Kibana        | http://localhost:5601      | ES dashboard       |
| Kafka UI      | http://localhost:8080      | Kafka dashboard    |

### Step 5: Verify the app is running

```bash
curl http://localhost:3000/health

# Expected response:
{ "status": "ok" }
```

---

## 2. Running Tests

### Unit Tests

Unit tests run in isolation using mocked dependencies — no real database or Kafka required.

```bash
# Run all unit tests
npm run test

# Run with coverage report
npm run test:cov

# Run specific test file
npm run test messages.service
npm run test messages.controller
npm run test kafka.producer
```

Expected output:

```
PASS src/messages/messages.service.spec.ts
  MessagesService
    create()
      ✓ should save message to MongoDB
      ✓ should publish event to Kafka after saving
      ✓ should return saved message
    findAll()
      ✓ should return paginated messages
      ✓ should query correct conversationId
      ✓ should calculate hasNextPage correctly
    search()
      ✓ should call elasticsearch searchMessages
      ✓ should return empty array for empty query

PASS src/messages/messages.controller.spec.ts
PASS src/kafka/kafka.producer.service.spec.ts
PASS src/messages/elasticsearch/messages-es.service.spec.ts
```

### API Integration Tests (e2e)

Integration tests connect to real services. Make sure Docker is running before executing.

```bash
# Make sure all services are running
docker-compose up -d

# Run e2e tests
npm run test:e2e
```

Integration tests cover:
- `POST /auth/login` — valid and invalid credentials
- `POST /api/messages` — create, validation, XSS sanitization, auth
- `GET /api/conversations/:id/messages` — pagination, sorting, auth
- `GET /api/conversations/:id/messages/search` — search, empty query, auth

---

## 3. Testing with Postman

### Test User Credentials

| Field    | Value       |
|----------|-------------|
| Username | testuser    |
| Password | password123 |

### Complete Test Flow

Follow these steps in order:

---

#### Step 1 — Login (Get JWT Token)

```
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

Expected response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> Copy the `access_token` — you will need it for all subsequent requests.

---

#### Step 2 — Create a Message

```
POST http://localhost:3000/api/messages
Content-Type: application/json
Authorization: Bearer <your-token-here>

{
  "conversationId": "conv-123",
  "senderId": "user-001",
  "content": "Hello, this is my first message!"
}
```

Expected response (201 Created):

```json
{
  "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
  "conversationId": "conv-123",
  "senderId": "user-001",
  "content": "Hello, this is my first message!",
  "timestamp": "2026-03-11T00:00:00.000Z",
  "createdAt": "2026-03-11T00:00:00.000Z"
}
```

---

#### Step 3 — Retrieve All Messages (with pagination)

```
GET http://localhost:3000/api/conversations/conv-123/messages
Authorization: Bearer <your-token-here>
```

With pagination and sorting options:

```bash
# Page 1, 10 messages per page, newest first
GET http://localhost:3000/api/conversations/conv-123/messages?page=1&limit=10&sort=desc

# Page 2
GET http://localhost:3000/api/conversations/conv-123/messages?page=2&limit=10

# Oldest first
GET http://localhost:3000/api/conversations/conv-123/messages?sort=asc
```

Expected response (200 OK):

```json
{
  "data": [
    {
      "_id": "65f1a2b3...",
      "conversationId": "conv-123",
      "senderId": "user-001",
      "content": "Hello, this is my first message!",
      "timestamp": "2026-03-11T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

#### Step 4 — Search Messages

> **Note:** Wait 2-3 seconds after creating messages before searching. Kafka needs time to index messages into Elasticsearch.

```
GET http://localhost:3000/api/conversations/conv-123/messages/search?q=hello
Authorization: Bearer <your-token-here>
```

Expected response (200 OK):

```json
[
  {
    "id": "65f1a2b3...",
    "conversationId": "conv-123",
    "senderId": "user-001",
    "content": "Hello, this is my first message!",
    "timestamp": "2026-03-11T00:00:00.000Z"
  }
]
```

---

### Common Error Responses

| Code | Error                 | Cause                                      |
|------|-----------------------|--------------------------------------------|
| 400  | Bad Request           | Missing required fields or validation failed |
| 401  | Unauthorized          | Missing or invalid JWT token               |
| 404  | Not Found             | Route does not exist                       |
| 500  | Internal Server Error | Server-side error — check logs             |
