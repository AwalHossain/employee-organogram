import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import cluster from 'node:cluster';
import * as os from 'os';

const numCPUs = os.cpus().length;
const optimalWorkers = Math.min(numCPUs * 2, 16);
const logger = new PinoLogger({ pinoHttp: { transport: { target: 'pino-pretty' } } });

@Injectable()
export class AppClusterService {
    static clusterize(callback: Function): void {
        // Check for DISABLE_CLUSTERING environment variable
        if (process.env.DISABLE_CLUSTERING === 'true') {
            logger.info('Clustering disabled. Running in single process mode');
            callback();
            return;
        }

        if (cluster.isPrimary) {
            logger.info(`Master server started on ${process.pid}`);
            logger.info(`Starting ${optimalWorkers} workers for handling high concurrency`);
            const workerRestarts = new Map<number, { count: number, lastRestart: number }>();

            // Create workers
            for (let i = 0; i < optimalWorkers; i++) {
                const worker = cluster.fork();
                if (worker.id) {
                    workerRestarts.set(worker.id, { count: 0, lastRestart: Date.now() });
                }
            }

            // Basic cluster restart on crash
            cluster.on('exit', (worker) => {
                logger.warn(`Worker ${worker.process.pid} died`);
                logger.info('Starting new worker');
                cluster.fork();
            });

            // Use basic process handling for graceful shutdown
            process.on('SIGTERM', () => {
                logger.info('Shutting down gracefully');
                process.exit(0);
            });
        } else {
            logger.info(`Worker ${process.pid} started`);
            // Start the application
            callback();
        }
    }
}
