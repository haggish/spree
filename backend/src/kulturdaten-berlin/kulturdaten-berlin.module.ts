import { Module } from '@nestjs/common';
import { KulturdatenService } from './kulturdaten.service';
import { KulturdatenApiService } from './kulturdaten-api.service';
import { LocationResolverService } from './location-resolver.service';

@Module({
  providers: [KulturdatenService, KulturdatenApiService, LocationResolverService],
  exports: [KulturdatenService],
})
export class KulturdatenBerlinModule {}
