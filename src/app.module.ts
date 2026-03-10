import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagesModule } from './messages/messages.module';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaModule } from './kafka/kafka.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ MongooseModule.forRoot(process.env.MONGODB_URI as string),
    MessagesModule,KafkaModule,AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
