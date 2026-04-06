import { Module } from '@nestjs/common';
import { IndexBerlinService } from './index-berlin.service';
import { IndexBerlinScraperService } from './index-berlin-scraper.service';
import { VenueResolverService } from './venue-resolver.service';

@Module({
  providers: [IndexBerlinService, IndexBerlinScraperService, VenueResolverService],
  exports: [IndexBerlinService],
})
export class IndexBerlinModule {}
