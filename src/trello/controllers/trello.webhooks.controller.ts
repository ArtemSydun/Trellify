import { Controller, Get, Post, Body, Param, Delete, Req, UseGuards, Put, HttpStatus } from '@nestjs/common';
import { TrelloService } from '../services/trello.service';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCustomConflictResponse, ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { ApiExcludeEndpoint, ApiOkResponse, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { Webhook } from '../entities/webhook.entity';

@Controller('trello/webhooks')
export class TrelloWebhooksController {
  constructor(private readonly trelloService: TrelloService) { }

  @Post()
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
  @UseGuards(JwtAuthGuard)
  createTrelloWebhook(
    @Req() req,
    @Body() body: CreateWebhookDto
  ) {
    return this.trelloService.createTrelloWebhook(req.user.userId, body);
  }

  @Get('list')
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'User connected webhooks list',
    type: [Webhook]
  })
  @UseGuards(JwtAuthGuard)
  getUserConnectedWebhooksList(@Req() req) {
    return this.trelloService.findMemberWebhooks(req.user.userId);
  }

  @Get(':userId')
  @ApiExcludeEndpoint()
  handleWebhookCreation(
    @Param('userId') userId: string,
    @Body() payload: any
  ) {
    console.log(`Created webhook for: ${userId}`, payload);

    return { status: 'success' };
  }

  @Post(':userId')
  @ApiExcludeEndpoint()
  handleWebhook(
    @Param('userId') userId: string,
    @Body() payload: any
  ) {
    console.log(`Received webhook action for userId: ${userId}`, JSON.stringify(payload, null, 2));

    return { status: 'success' };
  }

  @Put(':id')
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
  @UseGuards(JwtAuthGuard)
  updateWebhookById(@Param('id') id: string, @Body() updateWebhookDto: Webhook, @Req() req) {
    return this.trelloService.updateTrelloWebhook(req.user.userId, id, updateWebhookDto);
  }

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
  @UseGuards(JwtAuthGuard)
  removeWebhookById(@Req() req, @Param('id') webhookId: string): Promise<DefaultResponse<null>> {
    return this.trelloService.removeTrelloWebhook(req.user.userId, webhookId);
  }

  @Post('disconnect/:webhookId')
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
  @UseGuards(JwtAuthGuard)
  disconnectFromWebhook(@Req() req, @Param('webhookId') webhookId: string): Promise<DefaultResponse<null>> {
    return this.trelloService.disconnectFromTrelloWebhook(req.user.userId, webhookId);
  }
}
