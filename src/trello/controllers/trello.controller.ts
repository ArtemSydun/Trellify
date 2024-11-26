import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { TrelloService } from '../services/trello.service';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('trello')
export class TrelloController {
  constructor(private readonly trelloService: TrelloService) { }
  
  @UseGuards(JwtAuthGuard)
  @Post('webhook')
  createTrelloWebhook(
    @Req() req,
    @Body() body
  ) {
    return this.trelloService.createTrelloWebhook(req.user.userId, body.boardId);
  }

  @Post('webhook/:userId')
  async handleWebhook(
    @Param('userId') userId: string,
    @Body() payload: any
  ) {
    console.log(`Received webhook for userId: ${userId}`, payload);

    return { status: 'success' };
  }

  @Get('webhook/:id')
  findOne(@Param('id') id: string) {
    return 0;
  };

  @UseGuards(JwtAuthGuard)
  @Get('members/:id/boards')
  async findBoardsMemberBelongsTo(@Req() req, @Param('id') trelloMemberId: string) {
    return await this.trelloService.findBoardsMemberBelongsTo(req.user.userId, trelloMemberId);
  }

  @Patch('webhook/:id')
  update(@Param('id') id: string, @Body() updateTrelloDto) {
    return this.trelloService.update(+id, updateTrelloDto);
  }

  @UseGuards(JwtAuthGuard )
  @Delete('webhook/:id')
  removeWebhookById(@Req() req, @Param('id') webhookId: string): Promise<DefaultResponse<null>> {
    return this.trelloService.removeTrelloWebhook(req.user.userId, webhookId);
  }
}
