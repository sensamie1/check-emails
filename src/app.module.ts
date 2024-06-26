import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { OpenAIService } from './openai.service';
import { EmailProcessor } from './email.processor';
import { OutlookStrategy } from './outlook.strategy';
import { GoogleStrategy } from './google.strategy';
import { EmailService } from './email.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'google' }),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [AppController],
  providers: [
    OpenAIService,
    EmailProcessor,
    OutlookStrategy,
    GoogleStrategy,
    EmailService,
  ],
})
export class AppModule {}
