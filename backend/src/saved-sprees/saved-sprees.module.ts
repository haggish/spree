import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedSpreesController } from './saved-sprees.controller';
import { SavedSpreesService } from './saved-sprees.service';
import { SavedSpreeEntity } from './saved-spree.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedSpreeEntity])],
  controllers: [SavedSpreesController],
  providers: [SavedSpreesService],
  exports: [SavedSpreesService],
})
export class SavedSpreesModule {}
