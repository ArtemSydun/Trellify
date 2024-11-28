import { Controller, Get, Post, Body, Param, Delete, Req, UseGuards, Put } from '@nestjs/common';
import { TrelloService } from '../services/trello.service';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCustomConflictResponse, ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { WebhookDto } from '../dto/create-webhook.dto';

@Controller('trello/webhook')
export class TrelloWebhooksController {
  constructor(private readonly trelloService: TrelloService) { }

  @ApiCustomUnathorizedResponse()
  @ApiCustomConflictResponse('Webhook', 'id')
  @UseGuards(JwtAuthGuard)
  @Post()
  createTrelloWebhook(
    @Req() req,
    @Body() body
  ) {
    return this.trelloService.createTrelloWebhook(req.user.userId, body.boardId);
  }

  @ApiCustomUnathorizedResponse()
  @UseGuards(JwtAuthGuard)
  @Get('list')
  getUserWebhooksList(@Req() req) {
    return this.trelloService.findMemberWebhooks(req.user.userId);
  }

  @Get(':userId')
  handleWebhookCreation(
    @Param('userId') userId: string,
    @Body() payload: any
  ) {
    console.log(`Created webhook for: ${userId}`, payload);

    return { status: 'success' };
  }

  @Post(':userId')
  handleWebhook(
    @Param('userId') userId: string,
    @Body() payload: any
  ) {
    console.log(`Received webhook action for userId: ${userId}`, JSON.stringify(payload, null, 2));

    return { status: 'success' };
  }

  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('Webhook', 'id')
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  updateWebhookById(@Param('id') id: string, @Body() updateWebhookDto: WebhookDto, @Req() req) {
    return this.trelloService.updateTrelloWebhook(req.user.userId, id, updateWebhookDto);
  }

  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('Webhook', 'id')
  @UseGuards(JwtAuthGuard)
  @Delete('delete/:id')
  removeWebhookById(@Req() req, @Param('id') webhookId: string): Promise<DefaultResponse<null>> {
    return this.trelloService.removeTrelloWebhook(req.user.userId, webhookId);
  }

  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('Webhook', 'id')
  @UseGuards(JwtAuthGuard)
  @Post('disconnect/:webhookId')
  disconnectFromWebhook(@Req() req, @Param('webhookId') webhookId: string): Promise<DefaultResponse<null>> {
    return this.trelloService.disconnectFromTrelloWebhook(req.user.userId, webhookId);
  }
}
