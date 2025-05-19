import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  // Test environment - use SQLite in-memory database
  if (process.env.NODE_ENV === 'test') {
    return {
      type: 'sqlite',
      database: ':memory:',
      entities: ['dist/**/*.entity{.ts,.js}', 'src/**/*.entity{.ts,.js}'],
      synchronize: true,
      dropSchema: true,
      logging: false,
    };
  }

  // Production/Development - use PostgreSQL
  const config = {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'employee_organogram',
    entities: ['dist/**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // Connection pool settings
    extra: {
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '5'),
    },
  };

  // Override with DATABASE_URL if provided
  if (process.env.DATABASE_URL) {
    return {
      ...config,
      url: process.env.DATABASE_URL,
    };
  }

  return config;
});
