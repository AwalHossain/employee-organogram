import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  // Check if we're in test mode - use SQLite for tests
  if (process.env.NODE_ENV === 'test') {
    return {
      type: 'sqlite',
      database: ':memory:',
      entities: ['dist/**/*.entity{.ts,.js}', 'src/**/*.entity{.ts,.js}'],
      synchronize: true,
      dropSchema: true, // Reset the schema for each test run
      logging: false,
    };
  }

  // For non-test environments, use PostgreSQL
  const baseConfig = {
    type: 'postgres',
    entities: ['dist/**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production', // Be cautious with synchronize in production
    logging: process.env.DB_LOGGING === 'true',
  };

  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      url: process.env.DATABASE_URL,
      // When using DATABASE_URL with sslmode=require, TypeORM's pg driver
      // usually handles SSL automatically. Explicit ssl options here might
      // override or conflict. For Neon, the connection string is often sufficient.
      // If issues persist, you might need to add:
      // ssl: { rejectUnauthorized: false } // Depending on Neon's certificate setup for the pooler
    };
  } else {
    // Fallback to individual variables (less preferred if DATABASE_URL is available)
    return {
      ...baseConfig,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'organo', // Uses DB_DATABASE from your .env, or defaults to 'organo'
      // For Neon, if DB_SSL is true and not using a DATABASE_URL that handles SSL:
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
  }
});
