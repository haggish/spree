import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { Public } from '../auth';

@ApiTags('venues')
@Controller('api/venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all venues (public)' })
  findAll() {
    return this.venuesService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get venue by ID (public)' })
  findById(@Param('id') id: string) {
    return this.venuesService.findById(id);
  }
}
