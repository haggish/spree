import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { Public, Roles, CurrentUser, AuthUser } from '../auth';

@ApiTags('events')
@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all events with their venues (public)' })
  @ApiQuery({ name: 'startTime', required: false, description: 'ISO 8601 start time filter' })
  @ApiQuery({ name: 'endTime', required: false, description: 'ISO 8601 end time filter' })
  findAll(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    if (startTime && endTime) {
      return this.eventsService.findInTimeRange(startTime, endTime);
    }
    return this.eventsService.findAllWithVenues();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get event by ID with venue (public)' })
  findById(@Param('id') id: string) {
    return this.eventsService.findByIdWithVenue(id);
  }

  // ── Protected: organizer/admin only ──

  @Post()
  @Roles('organizer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event (organizer/admin only)' })
  create(
    @Body() body: { name: string; presenter: string; description: string; venueId: string; startTime: string; endTime: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.eventsService.create(body, user);
  }

  @Delete(':id')
  @Roles('organizer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event (organizer/admin only)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.remove(id, user);
  }
}
