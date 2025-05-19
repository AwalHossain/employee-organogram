import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { RedisService } from '../src/redis/redis.service';
import { RedisServiceMock } from './mocks/redis.mock';

describe('Redis Service (e2e)', () => {
    let app: INestApplication;
    let redisMock: RedisServiceMock;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(RedisService)
            .useClass(RedisServiceMock)
            .compile();

        app = moduleFixture.createNestApplication();
        redisMock = moduleFixture.get<RedisServiceMock>(RedisService);

        await app.init();
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    it('/cache-status (GET) should return Redis status information', async () => {
        const response = await request(app.getHttpServer())
            .get('/cache-status')
            .expect(200);

        expect(response.body).toHaveProperty('isRedisConnected', true);
        expect(response.body).toHaveProperty('cacheType', 'Test In-Memory');
    });

    it('/redis-test (GET) should test Redis operations and return success', async () => {
        const response = await request(app.getHttpServer())
            .get('/redis-test')
            .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('match', true);
    });

    it('/health (GET) should include Redis health check', async () => {
        const response = await request(app.getHttpServer())
            .get('/health')
            .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('info.redis');
        expect(response.body.info.redis).toHaveProperty('status', 'up');
    });

    it('/employees/cache-test (GET) should test Redis cache in employee controller', async () => {
        const response = await request(app.getHttpServer())
            .get('/employees/cache-test')
            .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('cachedValue');
    });
}); 