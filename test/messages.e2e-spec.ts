// test/messages.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SanitizePipe } from '../src/common/pipes/sanitize.pipe';

describe('Messages API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let createdMessageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],  // loads real app with real DB
    }).compile();

    app = moduleFixture.createNestApplication();

    // apply same pipes as main.ts
    app.useGlobalPipes(new SanitizePipe());
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('should return JWT token with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'alice', password: 'password123' })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      authToken = response.body.access_token;  // save for later tests
    });

    it('should return 401 with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'alice', password: 'wrongpassword' })
        .expect(401);
    });
  });

  // ── POST /api/messages ────────────────────────────────────────────────────

  describe('POST /api/messages', () => {
    it('should create a message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversationId: 'conv-e2e-test',
          senderId: 'user-1',
          content: 'Hello Integration Test',
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('conversationId', 'conv-e2e-test');
      expect(response.body).toHaveProperty('content', 'Hello Integration Test');

      createdMessageId = response.body._id;  // save for later
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ conversationId: 'conv-e2e-test' })  // missing senderId and content
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/messages')
        .send({
          conversationId: 'conv-e2e-test',
          senderId: 'user-1',
          content: 'Hello',
        })
        .expect(401);
    });

    it('should sanitize XSS in content', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversationId: 'conv-e2e-test',
          senderId: 'user-1',
          content: '<script>alert("xss")</script>Hello',
        })
        .expect(201);

      expect(response.body.content).toBe('Hello');  // script tag stripped ✅
      expect(response.body.content).not.toContain('<script>');
    });

    it('should strip unknown fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversationId: 'conv-e2e-test',
          senderId: 'user-1',
          content: 'Hello',
          unknownField: 'should be stripped',  // not in DTO
        })
        .expect(400);  // forbidNonWhitelisted → 400
    });
  });

  // ── GET /api/conversations/:id/messages ───────────────────────────────────

  describe('GET /api/conversations/:conversationId/messages', () => {
    it('should return paginated messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/conversations/conv-e2e-test/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should respect pagination params', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/conversations/conv-e2e-test/messages?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
    });

    it('should sort ascending when sort=asc', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/conversations/conv-e2e-test/messages?sort=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const messages = response.body.data;
      if (messages.length > 1) {
        const first = new Date(messages[0].timestamp).getTime();
        const second = new Date(messages[1].timestamp).getTime();
        expect(first).toBeLessThanOrEqual(second);  // oldest first ✅
      }
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/conversations/conv-e2e-test/messages')
        .expect(401);
    });

    it('should return empty data for unknown conversationId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/conversations/conv-does-not-exist/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.total).toBe(0);
    });
  });

  // ── GET /api/conversations/:id/messages/search ────────────────────────────

  describe('GET /api/conversations/:conversationId/messages/search', () => {
    it('should return empty array for empty query', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/conversations/conv-e2e-test/messages/search?q=')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/conversations/conv-e2e-test/messages/search?q=hello')
        .expect(401);
    });

    it('should search messages by keyword', async () => {
      // wait for Kafka → ES indexing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await request(app.getHttpServer())
        .get('/api/conversations/conv-e2e-test/messages/search?q=Integration')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});