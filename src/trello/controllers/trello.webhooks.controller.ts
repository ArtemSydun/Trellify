import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  UseGuards,
  HttpStatus,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  getSchemaPath,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import {
  ApiCustomBadRequestResponse,
  ApiCustomConflictResponse,
  ApiCustomForbiddenResponse,
  ApiCustomNotFoundResponse,
  ApiCustomUnathorizedResponse,
} from 'src/common/decorators/swagger.decorators';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { User } from 'src/user/entities/user.entity';
import { UserRoles } from 'src/user/enums/role.enum';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import {
  UpdateManyNotificationsDto,
  UpdateNotificationsDto,
} from '../dto/notifications.dto';
import { WebhookQueryDto } from '../dto/webhook.query.dto';
import { Webhook } from '../entities/webhook.entity';
import { NotificationProfiles } from '../interfaces/notification-profiles.interface';
import { TrelloWebhooksLogicService } from '../services/logic/trello.webhooks.logic.service';

@Controller('trello/webhooks')
export class TrelloWebhooksController {
  constructor(private readonly webhooksService: TrelloWebhooksLogicService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or subscribe to a Trello webhook',
    description:
      'This endpoint allows the user to create a new Trello webhook or subscribe to an existing one.',
  })
  @ApiOkResponse({
    description: 'Webhook created / user connected to existing webhook',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Webhook for board {{boardName}} created successfully / Webhook for the board {{boardName}} already exists. The user {{userId}} has been added to the webhook subscribers',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(Webhook),
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomBadRequestResponse(
    'Trello is not connected',
    'Please check your Trello connection',
  )
  @ApiCustomConflictResponse('Webhook', 'id')
  createTrelloWebhook(
    @Req() req,
    @Body() body: CreateWebhookDto,
  ): Promise<DefaultResponse<Webhook>> {
    return this.webhooksService.createTrelloWebhook(
      req.user,
      body,
      req.i18nContext,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin, UserRoles.admin, UserRoles.support)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Find webhooks with pagination & filtering (Superadmin / admin only',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    type: String,
    enum: ['asc', 'desc'],
    description: 'Sorting order (asc/desc, default: desc)',
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    type: String,
    enum: ['createdAt', 'updatedAt', 'boardName'],
    description: 'Sort by field (default: createdAt)',
  })
  @ApiQuery({
    name: 'idModel',
    required: false,
    type: String,
    description: 'Filter by Trello model ID',
  })
  @ApiQuery({
    name: 'boardName',
    required: false,
    type: String,
    description: 'Filter by board name (partial match)',
  })
  @ApiQuery({
    name: 'trelloUserId',
    required: false,
    type: String,
    description: 'Filter by webhook creator (Trello user ID)',
  })
  @ApiQuery({
    name: 'subscriberId',
    required: false,
    type: String,
    description: 'Filter by subscriber ID',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Start date for filtering (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'End date for filtering (YYYY-MM-DD)',
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  findWebhooks(@Query() queryParams: WebhookQueryDto) {
    return this.webhooksService.findWebhooks(queryParams);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get list of my connected webhooks',
    description:
      'This endpoint retrieves a list of Trello webhooks that the authenticated user is connected to.',
  })
  @ApiOkResponse({
    description: 'User connected webhooks list',
    type: [Webhook],
  })
  @ApiCustomUnathorizedResponse()
  getMyConnectedWebhooksList(@Req() req) {
    return this.webhooksService.findUserSubscribedWebhooks(
      req.user,
      req.i18nContext,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-webhook-id/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get webhook by id',
    description: 'This endpoint retrieves a webhook by id.',
  })
  @ApiOkResponse({
    description: 'Get webhook by id',
    type: Webhook,
  })
  @ApiCustomUnathorizedResponse()
  getWebhookById(@Param('id') id: string, @Req() req): Promise<Webhook> {
    return this.webhooksService.findWebhookById(id, req.i18nContext);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-board-id/:boardId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get webhook by board id',
    description: 'This endpoint retrieves a webhook by board id.',
  })
  @ApiOkResponse({
    description: 'Get webhook by board id',
    type: Webhook,
  })
  @ApiCustomUnathorizedResponse()
  getWebhookByBoardId(
    @Param('boardId') boardId: string,
    @Req() req,
  ): Promise<Webhook> {
    return this.webhooksService.findWebhookByBoardId(boardId, req.i18nContext);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin, UserRoles.admin, UserRoles.support)
  @Get(':id/subscribers')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get list of webhook subscribers',
    description:
      'This endpoint retrieves a list of Trello webhooks that the authenticated user is connected to.',
  })
  @ApiOkResponse({
    description: 'Webhook subscribers list',
    type: [User],
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  getUserConnectedWebhooksList(@Param('id') id: string): Promise<User[]> {
    return this.webhooksService.findWebhookSubscribers(id);
  }

  //Typically, when you're configuring a webhook with services like Trello or other similar platforms,
  //they send a GET request to your callback URL first to validate the endpoint before they start sending POST requests.
  //This is a standard webhook behavior to verify the callback URL is correct and responds appropriately.
  @SkipThrottle()
  @Get('provider/:boardId')
  @ApiExcludeEndpoint()
  handletrelloWebhookUrlCheck() {}

  // This is route where webhook sends data
  @SkipThrottle()
  @Post('provider/:boardId')
  @ApiExcludeEndpoint()
  handleWebhook(@Param('boardId') boardId: string, @Body() payload: any) {
    this.webhooksService.handleTrelloWebhook(payload);
    return { status: 'success' };
  }

  // @UseGuards(JwtAuthGuard)
  @Get('notifications/profiles')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notification profiles',
    description:
      'This endpoint allows to fetch predescribed notification profiles.',
  })
  @ApiOkResponse({
    description: 'Notification profiles',
    example: {
      basic: {
        price: 1,
        notifications: {
          card: {
            cardCreated: true,
          },
          checklist: {},
          list: {},
          board: {},
        },
      },
      advanced: {
        price: 3,
        notifications: {
          card: {
            cardCreated: true,
          },
          checklist: {},
          list: {},
          board: {},
        },
      },
      full: {
        price: 5,
        notifications: {
          card: {
            cardCreated: true,
          },
          checklist: {},
          list: {},
          board: {},
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  getNotificationProfiles(): Promise<NotificationProfiles> {
    return this.webhooksService.getProfileNotifications();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('notifications/bulk')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update notification in many webhooks',
    description:
      'This endpoint allows the authenticated user to update many webhook notifications',
  })
  @ApiOkResponse({
    description: 'Webhook updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Webhook {{id}} updated successfully',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(Webhook),
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse(`You are not connected to this webhook`)
  @ApiCustomNotFoundResponse('Webhook', 'id')
  updateManyWebhooksNotifications(
    @Body() updateManyWebhooksDto: UpdateManyNotificationsDto,
    @Req() req,
  ): Promise<any> {
    return this.webhooksService.updateManyTrelloWebhookNotifications(
      req.user,
      updateManyWebhooksDto,
      req.i18nContext,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('notifications/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a webhook notification subscriptions',
    description:
      'This endpoint allows the authenticated user to update notification subscriptions by webhook ID.',
  })
  @ApiOkResponse({
    description: 'Webhook updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Webhook {{id}} updated successfully',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(Webhook),
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse(`You are not connected to this webhook`)
  @ApiCustomNotFoundResponse('Webhook', 'id')
  updateWebhookNotificationsById(
    @Param('id') id: string,
    @Body() notificationBooleansDto: UpdateNotificationsDto,
    @Req() req,
  ): Promise<DefaultResponse<Webhook>> {
    return this.webhooksService.updateTrelloWebhookNotifications(
      req.user,
      id,
      notificationBooleansDto,
      req.i18nContext,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('healthcheck/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check health of the chosen webhook',
    description:
      'This endpoint allows the authenticated user to check health of webhook.',
  })
  @ApiOkResponse({
    description: 'Webhook health checked successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Webhook {{boardName}} was recreated / health is ok',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(Webhook),
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('Webhook', 'id')
  webhookHealthCheckById(
    @Param('id') id: string,
    @Req() req,
  ): Promise<DefaultResponse<Webhook>> {
    return this.webhooksService.webhookHealthCheck(
      id,
      req.user,
      req.i18nContext,
    );
  }

  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Delete('delete/all')
  removeAllWebhooks(@Req() req): Promise<DefaultResponse<null>> {
    return this.webhooksService.removeAllWebhooks(req.user, req.i18nContext);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Delete('delete/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a Trello webhook (Superadmin only)',
    description:
      'This endpoint allows to delete a Trello webhook by its ID and disconnect it from all users. It can only be accessed by users with superadmin role.',
  })
  @ApiOkResponse({
    description: 'Webhook disconnected and deleted from all users',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Webhook {{id}} deleted successfully from Trello and all connected users',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  @ApiCustomNotFoundResponse('Webhook', 'id')
  removeWebhookById(
    @Param('id') webhookId: string,
    @Req() req,
  ): Promise<DefaultResponse<null>> {
    return this.webhooksService.removeTrelloWebhook(webhookId, req.i18nContext);
  }

  @UseGuards(JwtAuthGuard)
  @Post('disconnect/:webhookId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disconnect from a Trello webhook',
    description:
      'This endpoint allows the authenticated user to disconnect from a Trello webhook by its ID.',
  })
  @ApiOkResponse({
    description: 'Webhook disconnected successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Webhook {{id}} disconnected successfully',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(Webhook),
        },
      },
    },
  })
  @ApiCustomBadRequestResponse(
    'User is not connected',
    'User is not connected to webhook {{webhookId}}',
  )
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('Webhook', 'id')
  disconnectFromWebhook(
    @Req() req,
    @Param('webhookId') webhookId: string,
  ): Promise<DefaultResponse<Webhook>> {
    return this.webhooksService.disconnectFromTrelloWebhook(
      req.user,
      webhookId,
      req.i18nContext,
    );
  }
}
