import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard as DefaultThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends DefaultThrottlerGuard {
  override getRequestResponse(context: ExecutionContext) {
    // Only apply throttle for HTTP contexts
    if (!context.switchToHttp().getRequest) {
      return { req: null, res: null };
    }

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    return { req, res };
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    // If not HTTP context, skip
    if (context.getType() !== 'http') {
      return true;
    }

    return super.canActivate(context);
  }
}
