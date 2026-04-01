import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SpreeService } from './spree.service';
import { ComputeSpreeDto } from '../common/dto';
import { Public } from '../auth';

@ApiTags('spree')
@Controller('api/spree')
export class SpreeController {
  constructor(private readonly spreeService: SpreeService) {}

  @Post('compute')
  @Public()
  @ApiOperation({ summary: 'Compute an optimized spree route plan (public)' })
  async computeSpree(@Body() dto: ComputeSpreeDto) {
    return this.spreeService.computeSpreePlan(dto);
  }
}
