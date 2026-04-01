import { Module } from '@nestjs/common';
import { SavedSpreesController } from './saved-sprees.controller';
import { SavedSpreesService } from './saved-sprees.service';

@Module({
  controllers: [SavedSpreesController],
  providers: [SavedSpreesService],
  exports: [SavedSpreesService],
})
export class SavedSpreesModule {}
