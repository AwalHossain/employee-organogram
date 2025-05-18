import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrmModule if you want to inject TypeOrmHealthIndicator related to a specific connection
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule, // TerminusModule itself
    // If your database connection is globally available or default, TerminusModule might be enough.
    // However, to be explicit or if you have multiple DB connections, you might need TypeOrmModule here too,
    // or ensure that the TypeOrmHealthIndicator can access the default connection.
    // For simplicity with a single default DB, TerminusModule often suffices for db.pingCheck.
    TypeOrmModule, // Make sure TypeOrm is available for TypeOrmHealthIndicator if not globally provided elsewhere
  ],
  controllers: [HealthController],
})
export class HealthModule {} 