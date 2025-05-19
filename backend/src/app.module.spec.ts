import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { RedisModule } from './redis/redis.module';
import { RedisService } from './redis/redis.service';

describe('AppModule', () => {
  let appModule: TestingModule;

  // Mock RedisService to avoid connection issues in tests
  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getStatus: jest.fn(),
    getClient: jest.fn().mockReturnValue(null),
  };

  beforeEach(async () => {
    // Create a testing module with mocked dependencies
    appModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();
  });

  it('should be defined', () => {
    expect(appModule).toBeDefined();
  });

  it('should have the required modules', () => {
    // Check if ConfigModule is available
    const configModule = appModule.get(ConfigModule, { strict: false });
    expect(configModule).toBeDefined();

    // Check if DatabaseModule is available
    const databaseModule = appModule.get(DatabaseModule, { strict: false });
    expect(databaseModule).toBeDefined();

    // Check if AuthModule is available
    const authModule = appModule.get(AuthModule, { strict: false });
    expect(authModule).toBeDefined();

    // Check if EmployeesModule is available
    const employeesModule = appModule.get(EmployeesModule, { strict: false });
    expect(employeesModule).toBeDefined();

    // Check if RedisModule is available
    const redisModule = appModule.get(RedisModule, { strict: false });
    expect(redisModule).toBeDefined();
  });
}); 