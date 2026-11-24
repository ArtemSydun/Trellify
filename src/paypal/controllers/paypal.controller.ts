import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import { User } from 'src/user/entities/user.entity';
import { UserRoles } from 'src/user/enums/role.enum';
import { PaypalLogicService } from '../services/paypal-logic.service';

@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalLogicService: PaypalLogicService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.admin, UserRoles.superadmin)
  @Get('webhook/all')
  getWebhooks() {
    return this.paypalLogicService.findWebhooks();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.admin, UserRoles.superadmin)
  @Post('webhook')
  createWebhook() {
    return this.paypalLogicService.createWebhook();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.admin, UserRoles.superadmin)
  @Delete('webhook/:webhookId')
  deleteWebhook(@Param('webhookId') webhookId: string, @Req() req) {
    return this.paypalLogicService.deleteWebhook(webhookId, req.i18nContext);
  }

  @ApiExcludeEndpoint()
  @SkipThrottle()
  @Post('webhook/callback')
  async paypalWebhook(@Body() payload: any) {
    try {
      await this.paypalLogicService.handleWebhookEvent(payload);
      return {
        statusCode: HttpStatus.OK,
      };
    } catch (err) {
      console.error('[PayPal Webhook Error]', err);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm subscription payment from PayPal',
    description: 'Confirm subscription payment from PayPal.',
  })
  @ApiOkResponse({
    description: 'Subscription plan payment confirmed',
    type: User,
  })
  @Get('subscription-payment')
  async confirmSubscriptionActivation(
    @Query('paypalPlanId') paypalPlanId: string,
    @Query('paypalSubscriptionId') paypalSubscriptionId: string,
    @Query('amount') amount: string,
    @Req() req,
  ) {
    return this.paypalLogicService.confirmSubscriptionActivation(
      paypalPlanId,
      paypalSubscriptionId,
      amount,
      req.user.id,
      req.i18nContext,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check subscription payment if something is wrong',
    description: 'Check subscription payment if something is wrong.',
  })
  @ApiOkResponse({
    description: 'Subscription payment checked. Everything is good',
    type: User,
  })
  @Get('subscription-payment/check')
  async checkSubscriptionPayment(@Req() req) {
    return this.paypalLogicService.checkSubscriptionPayment(
      req.user.id,
      req.i18nContext,
    );
  }
}
