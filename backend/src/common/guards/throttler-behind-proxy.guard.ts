import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
    protected override getTracker(req: Record<string, any>): Promise<string> {
        // Get the real IP when behind a proxy
        const realIp = req.headers?.['x-forwarded-for'];
        const ip = realIp
            ? (Array.isArray(realIp) ? realIp[0] : realIp.split(',')[0])
            : (req.ip || 'unknown');
        return Promise.resolve(ip);
    }
} 