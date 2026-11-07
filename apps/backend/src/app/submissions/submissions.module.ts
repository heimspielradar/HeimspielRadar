import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { DatabaseModule } from '../database/database.module';
import { ScraperModule } from '../scraper/scraper.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [DatabaseModule, ScraperModule, AdminModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
