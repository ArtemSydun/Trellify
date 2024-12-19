import { Controller, Get, Post, Body, Param, Delete, Req, UseGuards, HttpStatus, Patch } from '@nestjs/common';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCustomBadRequestResponse, ApiCustomConflictResponse, ApiCustomForbiddenResponse, ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { ApiExcludeEndpoint, ApiOkResponse, getSchemaPath, ApiOperation } from '@nestjs/swagger';
import { Webhook } from '../entities/webhook.entity';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import { UserRoles } from 'src/user/interfaces/role.enum';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UpdateWebhookDto } from '../dto/update-webhook.dto';
import { TrelloWebhooksLogicService } from '../services/logic/trello.webhooks.logic.service';

@Controller('trello/webhooks')
export class TrelloWebhooksController {
  constructor(private readonly webhooksService: TrelloWebhooksLogicService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create or subscribe to a Trello webhook',
    description: 'This endpoint allows the user to create a new Trello webhook or subscribe to an existing one.',
  })
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'New webhook created successfully or subscribed to the existing one',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Webhook created successfully',
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
  @ApiCustomConflictResponse('Webhook', 'id')
  @ApiCustomBadRequestResponse('Trello is not connected', 'Please check your Trello connection')
  createTrelloWebhook(
    @Req() req,
    @Body() body: CreateWebhookDto
  ): Promise<DefaultResponse<Webhook>> {
    return this.webhooksService.createTrelloWebhook(req.user.userId, body);
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get list of connected webhooks',
    description: 'This endpoint retrieves a list of Trello webhooks that the authenticated user is connected to.',
  })
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'User connected webhooks list',
    type: [Webhook],
  })
  getUserConnectedWebhooksList(@Req() req) {
    return this.webhooksService.findMemberWebhooks(req.user.userId);
  }

  //Typically, when you're configuring a webhook with services like Trello or other similar platforms, 
  //they send a GET request to your callback URL first to validate the endpoint before they start sending POST requests. 
  //This is a standard webhook behavior to verify the callback URL is correct and responds appropriately.
  @Get(':boardId')
  @ApiExcludeEndpoint()
  handleWebhookCallbackUrlCheck() { }

  // This is route where webhook sends data
  @Post(':boardId')
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Param('boardId') boardId: string,
    @Body() payload: any
  ) {
    await this.webhooksService.handleTrelloWebhook(payload);
    return { status: 'success' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('notifications/:id')
  @ApiOperation({
    summary: 'Update a webhook notification subscriptions',
    description: 'This endpoint allows the authenticated user to update notification subscriptions by webhook ID.',
  })
  @ApiCustomUnathorizedResponse()
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
  @ApiCustomNotFoundResponse('Webhook', 'id')
  updateWebhookById(@Param('id') id: string, @Body() updateWebhookDto: UpdateWebhookDto, @Req() req): Promise<DefaultResponse<Webhook>> {
    return this.webhooksService.updateTrelloWebhookNotifications(req.user.userId, id, updateWebhookDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Delete('delete/:id')
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

  @Post('disconnect/:webhookId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Disconnect from a Trello webhook',
    description: 'This endpoint allows the authenticated user to disconnect from a Trello webhook by its ID.',
  })
  @ApiCustomUnathorizedResponse()
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
  @ApiCustomNotFoundResponse('Webhook', 'id')
  @ApiCustomBadRequestResponse('User is not connected', 'User is not connected to webhook {{webhookId}}')
  disconnectFromWebhook(@Req() req, @Param('webhookId') webhookId: string): Promise<DefaultResponse<null>> {
    return this.webhooksService.disconnectFromTrelloWebhook(req.user.userId, webhookId);
  }
}
