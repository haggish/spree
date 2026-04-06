import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EventGroupsService } from './event-groups.service';
import { Public } from '../auth';

@ApiTags('event-groups')
@Controller('api/event-groups')
export class EventGroupsController {
  constructor(private readonly eventGroupsService: EventGroupsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all event groups (public)' })
  findAll() {
    return this.eventGroupsService.findAll();
  }

  @Get(':id/at/:date')
  @Public()
  @ApiOperation({ summary: 'Get event group filtered by date (YYYY-MM-DD) (public)' })
  async findByIdAtDate(@Param('id') id: string, @Param('date') date: string) {
    const group = await this.eventGroupsService.findByIdAtDate(id, date);
    if (!group) {
      throw new NotFoundException(`Event group "${id}" not found`);
    }
    return group;
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get event group with all events (public)' })
  async findById(@Param('id') id: string) {
    const group = await this.eventGroupsService.findById(id);
    if (!group) {
      throw new NotFoundException(`Event group "${id}" not found`);
    }
    return group;
  }
}
