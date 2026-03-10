import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';

@Controller('api')
@UseGuards(JwtAuthGuard)  
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('messages')
  createMessage(@Body() dto: CreateMessageDto) {
    return this.messagesService.create(dto);
  }

  @Get('conversations/:conversationId/messages/search')
  search(
    @Param('conversationId') conversationId: string,
    @Query('q') q: string,
  ) {
    return this.messagesService.search(conversationId, q);
  }

  @Get('conversations/:conversationId/messages')
  findAll(
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesDto,
  ) {
    return this.messagesService.findAll(conversationId, query);
  }
}