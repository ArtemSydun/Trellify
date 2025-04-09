import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import {
  ApiCustomForbiddenResponse,
  ApiCustomNotFoundResponse,
} from 'src/common/decorators/swagger.decorators';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { UserRoles } from 'src/user/enums/role.enum';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionService } from '../services/subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new subscription plan, (Superadmin only)',
    description: 'Create new subscription plan.',
  })
  @ApiOkResponse({
    description: 'Create new subscription plan',
    type: Subscription,
  })
  @ApiCustomForbiddenResponse()
  createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @Req() req,
  ): Promise<DefaultResponse<Subscription>> {
    return this.subscriptionService.createSubscription(
      createSubscriptionDto,
      req.i18nContext,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all subscription plans',
    description: 'Get all subscription plans.',
  })
  @ApiOkResponse({
    description: 'All subscription plans',
    type: [Subscription],
  })
  findAllSubscriptions(): Promise<Subscription[]> {
    return this.subscriptionService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get subscription plan by id',
    description: 'Get subscription plan by id',
  })
  @ApiOkResponse({
    description: 'Subscription plan by id',
    type: Subscription,
  })
  @ApiCustomNotFoundResponse('Subscription plan', 'id')
  findOneSubscription(
    @Param('id') id: string,
    @Req() req,
  ): Promise<Subscription> {
    return this.subscriptionService.findSubscriptionById(id, req.i18nContext);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update subscription plan by id (Superadmin only)',
    description: 'Update subscription plan by id',
  })
  @ApiOkResponse({
    description: 'Subscription plan {{id}} updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Subscription plan {{id}} updated successfully',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(Subscription),
        },
      },
    },
  })
  updateSubscription(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @Req() req,
  ): Promise<DefaultResponse<Subscription>> {
    return this.subscriptionService.updateSubscriptionById(
      id,
      updateSubscriptionDto,
      req.i18nContext,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete subscription plan by id (Superadmin only)',
    description: 'Delete subscription plan by id',
  })
  @ApiOkResponse({
    description: 'Delete subscription plan by id',
    type: Subscription,
  })
  removeSubscription(@Param('id') id: string, @Req() req) {
    return this.subscriptionService.deleteSubscriptionById(id, req.i18nContext);
  }
}
