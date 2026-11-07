import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ScraperModule } from '../scraper/scraper.module';
import { AdminApiGuard } from './admin-api.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [DatabaseModule, ScraperModule],
  controllers: [AdminController],
  providers: [AdminService, AdminApiGuard],
  exports: [AdminService, AdminApiGuard],
})
export class AdminModule {}
