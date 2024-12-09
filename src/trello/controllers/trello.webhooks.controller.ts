import { Controller, Get, Post, Body, Param, Delete, Req, UseGuards, Put, HttpStatus, Patch } from '@nestjs/common';
import { TrelloService } from '../services/trello.service';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCustomConflictResponse, ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { ApiExcludeEndpoint, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { Webhook } from '../entities/webhook.entity';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import { UserRoles } from 'src/user/interfaces/role.enum';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UpdateWebhookDto } from '../dto/update-webhook.dto';

@Controller('trello/webhooks')
export class TrelloWebhooksController {
  constructor(private readonly trelloService: TrelloService,
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
  createTrelloWebhook(
    @Req() req,
    @Body() body: CreateWebhookDto
  ): Promise<DefaultResponse<Webhook>> {
    return this.trelloService.createTrelloWebhook(req.user.userId, body);
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'User connected webhooks list',
    type: [Webhook]
  })
  getUserConnectedWebhooksList(@Req() req) {
    return this.trelloService.findMemberWebhooks(req.user.userId);
  }

  @Get(':boardId')
  @ApiExcludeEndpoint()
  handleWebhookCreation(
    @Param('boardId') boardId: string,
    @Body() payload: any
  ) {
    console.log(`Created webhook for: ${boardId}`, payload);

    return { status: 'success' };
  }

  @Post(':boardId')
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Param('boardId') boardId: string,
    @Body() payload: any
  ) {
    // console.log(`Received webhook action for boardId: ${boardId}`, JSON.stringify(payload, null, 2));

    await this.trelloService.handleTrelloWebhook(payload);

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
    return this.trelloService.updateTrelloWebhook(req.user.userId, id, updateWebhookDto);
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
    return this.trelloService.removeTrelloWebhook(webhookId);
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
    return this.trelloService.disconnectFromTrelloWebhook(req.user.userId, webhookId);
  }
}
