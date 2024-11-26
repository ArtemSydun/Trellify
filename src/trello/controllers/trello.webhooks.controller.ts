import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { TrelloService } from '../services/trello.service';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('trello/webhook')
export class TrelloWebhooksController {
  constructor(private readonly trelloService: TrelloService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  createTrelloWebhook(
    @Req() req,
    @Body() body
  ) {
    return this.trelloService.createTrelloWebhook(req.user.userId, body.boardId);
  }

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
    console.log(`Received webhook for userId: ${userId}`, payload);

    return { status: 'success' };
  }


  // @Patch('webhook/:id')
  // update(@Param('id') id: string, @Body() updateTrelloDto) {
  //   return this.trelloService.update(+id, updateTrelloDto);
  // }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  removeWebhookById(@Req() req, @Param('id') webhookId: string): Promise<DefaultResponse<null>> {
    return this.trelloService.removeTrelloWebhook(req.user.userId, webhookId);
  }
}
