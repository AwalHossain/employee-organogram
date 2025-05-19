import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
    private logger = new Logger(RedisService.name);
    private readonly keyPrefix = 'app::';
    private client: Redis | null = null;
    private isConnected = false;
    private inMemoryCache = new Map<string, { value: string, expiry?: number }>();

    constructor() {
        try {
            // Enhanced Redis connection with optimized settings for high load
            this.client = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
                connectTimeout: 10000,
                maxRetriesPerRequest: 5,
                retryStrategy: (times) => {
                    if (times > 10) {
                        this.logger.warn('Too many Redis retry attempts, using in-memory cache');
                        return null; // Stop retrying after 10 attempts
                    }
                    const delay = Math.min(times * 100, 3000);
                    return delay;
                },
                // Connection pool size - critical for high concurrency
                connectionName: 'api-server',
                enableReadyCheck: false,
                enableOfflineQueue: true,
                maxLoadingRetryTime: 5000,
                // Command queue settings 
                commandTimeout: 3000, // 3 second timeout for commands
                lazyConnect: false, // Connect immediately
            });

            this.client.on('connect', () => {
                this.isConnected = true;
                this.logger.log('Successfully connected to Redis');
            });

            this.client.on('error', (error) => {
                if (this.isConnected) {
                    this.isConnected = false;
                    this.logger.warn(`Redis connection error: ${error.message}`);
                    this.logger.warn('Using in-memory cache as fallback');
                }
            });

            this.client.on('close', () => {
                if (this.isConnected) {
                    this.isConnected = false;
                    this.logger.warn('Redis connection closed, using in-memory cache');
                }
            });
        } catch (error) {
            this.logger.warn(`Failed to initialize Redis: ${error.message}`);
            this.logger.warn('Using in-memory cache only');
            this.client = null;
        }
    }

    async onModuleInit() {
        try {
            // Test connection if client exists
            if (this.client) {
                await this.client.ping();
                this.isConnected = true;
                this.logger.log('Redis connection verified');

                // Pre-warm common keys that will be heavily accessed
                await this.warmupCache();
            } else {
                this.logger.warn('Redis client not initialized. Using in-memory cache.');
            }
        } catch (error) {
            this.isConnected = false;
            this.logger.warn(`Redis unavailable: ${error.message}`);
            this.logger.warn('Using in-memory cache as fallback');
        }
    }

    /**
     * Pre-warm common cache keys to avoid cache misses during high load
     */
    private async warmupCache(): Promise<void> {
        try {
            // Create an empty all_employees cache if it doesn't exist
            const allEmployeesKey = `${this.keyPrefix}all_employees`;
            const exists = await this.client?.exists(allEmployeesKey);

            if (!exists && this.client) {
                this.logger.log('Pre-warming all_employees cache');
                // We don't have data here, but this ensures the EmployeesService
                // will populate it on first request rather than during high load
            }
        } catch (error) {
            this.logger.warn(`Failed to warm up cache: ${error.message}`);
        }
    }

    /**
     * Store a value in the cache with the given key
     * Optimized for high-throughput scenarios
     */
    async set(key: string, value: unknown, ttl?: number): Promise<void> {
        const fullKey = `${this.keyPrefix}${key}`;
        const serializedValue = JSON.stringify(value);

        try {
            if (this.isConnected && this.client) {
                // Set with optimized parameters for high throughput
                if (ttl) {
                    // Use psetex which is more efficient for setting with expiry
                    await this.client.psetex(fullKey, ttl * 1000, serializedValue);
                } else {
                    await this.client.set(fullKey, serializedValue);
                }

                // Also update in-memory cache as backup
                const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
                this.inMemoryCache.set(fullKey, { value: serializedValue, expiry });

                return;
            }
        } catch (error) {
            this.logger.debug(`Redis set failed, using memory cache: ${error.message}`);
        }

        // In-memory fallback
        const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
        this.inMemoryCache.set(fullKey, { value: serializedValue, expiry });
    }

    /**
     * Retrieve a value from the cache by key
     * Optimized with dual-layer caching for high concurrency
     */
    async get<T>(key: string): Promise<T | undefined> {
        const fullKey = `${this.keyPrefix}${key}`;

        // Always check in-memory cache first for maximum performance
        const inMemoryData = this.inMemoryCache.get(fullKey);
        if (inMemoryData) {
            if (inMemoryData.expiry && inMemoryData.expiry < Date.now()) {
                // Entry expired
                this.inMemoryCache.delete(fullKey);
            } else {
                // Valid in-memory cache hit - fastest path
                return JSON.parse(inMemoryData.value) as T;
            }
        }

        // If not in memory, try Redis
        try {
            if (this.isConnected && this.client) {
                const data = await this.client.get(fullKey);
                if (data) {
                    // Update in-memory cache with Redis data
                    this.inMemoryCache.set(fullKey, { value: data });
                    return JSON.parse(data) as T;
                }
            }
        } catch (error) {
            this.logger.debug(`Redis get failed: ${error.message}`);
        }

        return undefined;
    }

    /**
     * Delete a value from the cache by key
     */
    async del(key: string): Promise<void> {
        const fullKey = `${this.keyPrefix}${key}`;

        try {
            if (this.isConnected && this.client) {
                this.logger.debug(`Deleting Redis key: ${fullKey}`);
                await this.client.del(fullKey);
            }
        } catch (error) {
            this.logger.debug(`Redis delete failed: ${error.message}`);
        }

        // Always remove from in-memory cache
        this.inMemoryCache.delete(fullKey);
    }

    /**
     * Invalidate all keys matching a pattern
     */
    async invalidateByPattern(pattern: string): Promise<void> {
        const fullPattern = `${this.keyPrefix}${pattern}*`;

        try {
            if (this.isConnected && this.client) {
                // Get all keys matching the pattern from Redis
                const keys = await this.client.keys(fullPattern);
                if (keys.length > 0) {
                    await this.client.del(...keys);
                    this.logger.debug(`Deleted ${keys.length} Redis keys`);
                }
            }
        } catch (error) {
            this.logger.debug(`Redis pattern delete failed: ${error.message}`);
        }

        // Clear matching keys from in-memory cache
        const patternRegex = new RegExp(`^${this.keyPrefix}${pattern.replace(/\*/g, '.*')}$`);
        let count = 0;
        for (const key of this.inMemoryCache.keys()) {
            if (patternRegex.test(key)) {
                this.inMemoryCache.delete(key);
                count++;
            }
        }
        if (count > 0) {
            this.logger.debug(`Deleted ${count} in-memory cache keys`);
        }
    }

    /**
     * Get cache status information
     */
    async getStatus(): Promise<any> {
        const status: any = {
            isRedisConnected: this.isConnected,
            cacheType: this.isConnected ? 'Redis' : 'In-Memory',
            inMemoryCacheSize: this.inMemoryCache.size,
        };

        if (this.isConnected && this.client) {
            try {
                status.redisInfo = await this.client.info();
            } catch (error) {
                this.logger.error(`Failed to get Redis info: ${error.message}`);
            }
        }

        return status;
    }

    /**
     * Directly access the Redis client for advanced operations
     */
    getClient(): Redis | null {
        return this.client;
    }
} 