import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto, SortOrder } from './dto/get-messages.dto';
import { Message } from './schemas/message.schema';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { MessagesEsService } from './elasticsearch/messages-es.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly messagesEsService: MessagesEsService,
  ) {}

  async create(dto: CreateMessageDto) {
    const message = new this.messageModel(dto);
    const saved = await message.save();
    await this.kafkaProducer.publishMessageCreated(saved);
    return saved;
  }

  async findAll(conversationId: string, query: GetMessagesDto) {
    const { page = 1, limit = 20, sort = SortOrder.DESC } = query;
    const skip = (page - 1) * limit;
  
    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ conversationId })
        .select('conversationId senderId content timestamp metadata')  //  only fetch needed fields
        .sort({ timestamp: sort === SortOrder.DESC ? -1 : 1 })
        .skip(skip)
        .limit(Math.min(limit, 100))  //  cap limit at 100 to prevent abuse
        .lean()                        //  returns plain JS object instead of Mongoose document (faster)
        .exec(),
      this.messageModel.countDocuments({ conversationId }),
    ]);
  
    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async search(conversationId: string, q: string) {
    if (!q || q.trim() === '') {
      return [];  // 👈 return empty array for empty query
    }
    return this.messagesEsService.searchMessages(conversationId, q);
  }
}