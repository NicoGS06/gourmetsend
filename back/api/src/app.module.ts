import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ContactsModule } from './contacts/contacts.module';
import { GroupsModule } from './groups/groups.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    ContactsModule,
    GroupsModule,
    CampaignsModule,
    WhatsappModule,
  ],
})
export class AppModule {}
