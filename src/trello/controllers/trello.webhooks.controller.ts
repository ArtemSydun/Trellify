import { Controller, Get, Post, Body, Param, Delete, Req, UseGuards, HttpStatus, Patch } from '@nestjs/common';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCustomBadRequestResponse, ApiCustomConflictResponse, ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { ApiExcludeEndpoint, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { Webhook } from '../entities/webhook.entity';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import { UserRoles } from 'src/user/interfaces/role.enum';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UpdateWebhookDto } from '../dto/update-webhook.dto';
import { WebhookService } from '../services/webhook.service';

@Controller('trello/webhooks')
export class TrelloWebhooksController {
  constructor(private readonly webhookService: WebhookService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
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
  @ApiCustomBadRequestResponse('Trello is not connected', 'Please check your trello connection')
  createTrelloWebhook(
    @Req() req,
    @Body() body: CreateWebhookDto
  ): Promise<DefaultResponse<Webhook>> {
    return this.webhookService.createTrelloWebhook(req.user.userId, body);
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'User connected webhooks list',
    type: [Webhook]
  })
  getUserConnectedWebhooksList(@Req() req) {
    return this.webhookService.findMemberWebhooks(req.user.userId);
  }

  @Get(':boardId')
  @ApiExcludeEndpoint()
  handleWebhookCreation(
    @Param('boardId') boardId: string,
  ) {
    return { status: 'success' };
  }

  @Post(':boardId')
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Param('boardId') boardId: string,
    @Body() payload: any
  ) {
    await this.webhookService.handleTrelloWebhook(payload);

    return { status: 'success' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
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
    return this.webhookService.updateTrelloWebhook(req.user.userId, id, updateWebhookDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Delete('delete/:id')
  @ApiCustomUnathorizedResponse()
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
  @ApiCustomNotFoundResponse('Webhook', 'id')
  removeWebhookById(@Param('id') webhookId: string): Promise<DefaultResponse<null>> {
    return this.webhookService.removeTrelloWebhook(webhookId);
  }

  @Post('disconnect/:webhookId')
  @UseGuards(JwtAuthGuard)
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
  disconnectFromWebhook(@Req() req, @Param('webhookId') webhookId: string): Promise<DefaultResponse<null>> {
    return this.webhookService.disconnectFromTrelloWebhook(req.user.userId, webhookId);
  }
}
