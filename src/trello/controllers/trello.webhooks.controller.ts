import { Controller, Get, Post, Body, Param, Delete, Req, UseGuards, HttpStatus, Patch } from '@nestjs/common';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCustomBadRequestResponse, ApiCustomConflictResponse, ApiCustomForbiddenResponse, ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { ApiExcludeEndpoint, ApiOkResponse, getSchemaPath, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Webhook } from '../entities/webhook.entity';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import { UserRoles } from 'src/user/interfaces/role.enum';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { TrelloWebhooksLogicService } from '../services/logic/trello.webhooks.logic.service';
import { NotificationBooleansDto } from '../dto/notifications.dto';

@Controller('trello/webhooks')
export class TrelloWebhooksController {
  constructor(private readonly webhooksService: TrelloWebhooksLogicService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or subscribe to a Trello webhook',
    description: 'This endpoint allows the user to create a new Trello webhook or subscribe to an existing one.',
  })
  @ApiOkResponse({
    description: 'Webhook created / user connected to existing webhook',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Webhook for board {{boardName}} created successfully / Webhook for the board {{boardName}} already exists. The user {{userId}} has been added to the webhook subscribers',
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
  @ApiCustomBadRequestResponse('Trello is not connected', 'Please check your Trello connection')
  @ApiCustomConflictResponse('Webhook', 'id')
  createTrelloWebhook(
    @Req() req,
    @Body() body: CreateWebhookDto
  ): Promise<DefaultResponse<Webhook>> {
    return this.webhooksService.createTrelloWebhook(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('list')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get list of connected webhooks',
    description: 'This endpoint retrieves a list of Trello webhooks that the authenticated user is connected to.',
  })
  @ApiOkResponse({
    description: 'User connected webhooks list',
    type: [Webhook],
  })
  @ApiCustomUnathorizedResponse()
  getUserConnectedWebhooksList(@Req() req) {
    return this.webhooksService.findMemberWebhooks(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
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
  getWebhookById(@Param('id') id: string): Promise<Webhook> {
    return this.webhooksService.findWebhookById(id);
  }


  //Typically, when you're configuring a webhook with services like Trello or other similar platforms, 
  //they send a GET request to your callback URL first to validate the endpoint before they start sending POST requests. 
  //This is a standard webhook behavior to verify the callback URL is correct and responds appropriately.
  @Get('provider/:boardId')
  @ApiExcludeEndpoint()
  handleWebhookCallbackUrlCheck() { }

  // This is route where webhook sends data
  @Post('provider/:boardId')
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Param('boardId') boardId: string,
    @Body() payload: any
  ) {
    await this.webhooksService.handleTrelloWebhook(payload);
    return { status: 'success' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('notifications/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a webhook notification subscriptions',
    description: 'This endpoint allows the authenticated user to update notification subscriptions by webhook ID.',
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
  updateWebhookById(@Param('id') id: string, @Body() notificationBooleansDto: NotificationBooleansDto, @Req() req): Promise<DefaultResponse<Webhook>> {
    return this.webhooksService.updateTrelloWebhookNotifications(req.user.id, id, notificationBooleansDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Delete('delete/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a Trello webhook (Superadmin only)',
    description: 'This endpoint allows to delete a Trello webhook by its ID and disconnect it from all users. It can only be accessed by users with superadmin role.',
  })
  @ApiOkResponse({
    description: 'Webhook disconnected and deleted from all users',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Webhook {{id}} deleted successfully from Trello and all connected users',
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
  removeWebhookById(@Param('id') webhookId: string): Promise<DefaultResponse<null>> {
    return this.webhooksService.removeTrelloWebhook(webhookId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('disconnect/:webhookId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disconnect from a Trello webhook',
    description: 'This endpoint allows the authenticated user to disconnect from a Trello webhook by its ID.',
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
      },
    },
  })
  @ApiCustomBadRequestResponse('User is not connected', 'User is not connected to webhook {{webhookId}}')
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('Webhook', 'id')
  disconnectFromWebhook(@Req() req, @Param('webhookId') webhookId: string): Promise<DefaultResponse<null>> {
    return this.webhooksService.disconnectFromTrelloWebhook(req.user.id, webhookId);
  }
}
