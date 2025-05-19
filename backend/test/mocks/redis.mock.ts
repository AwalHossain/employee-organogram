import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisServiceMock {
    private inMemoryCache = new Map<string, any>();

    async get<T>(key: string): Promise<T | undefined> {
        return this.inMemoryCache.get(key);
    }

    async set(key: string, value: unknown, ttl?: number): Promise<void> {
        this.inMemoryCache.set(key, value);
    }

    async del(key: string): Promise<void> {
        this.inMemoryCache.delete(key);
    }

    async invalidateByPattern(pattern: string): Promise<void> {
        // Simple pattern matching for tests
        const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);

        for (const key of this.inMemoryCache.keys()) {
            if (regex.test(key)) {
                this.inMemoryCache.delete(key);
            }
        }
    }

    async getStatus(): Promise<any> {
        return {
            isRedisConnected: true,
            cacheType: 'Test In-Memory',
            inMemoryCacheSize: this.inMemoryCache.size,
        };
    }

    getClient() {
        return {
            ping: async () => 'PONG',
        };
    }
} 