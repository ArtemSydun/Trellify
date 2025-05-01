import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

function getIp(req: Record<string, any>): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ips?.[0] || req.ip;
}

@Injectable()
export class ThrottlerHttpProxyGuard extends ThrottlerGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for non-HTTP contexts
    if (context.getType() !== 'http') {
      return true;
    }

    return super.canActivate(context);
  }

  override getRequestResponse(context: ExecutionContext): {
    req: Record<string, any>;
    res: Record<string, any>;
  } {
    const httpContext = context.switchToHttp();
    return {
      req: httpContext.getRequest(),
      res: httpContext.getResponse(),
    };
  }

  override async getTracker(req: Record<string, any>): Promise<string> {
    return getIp(req);
  }
}
