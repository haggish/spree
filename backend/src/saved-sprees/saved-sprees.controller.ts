import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SavedSpreesService } from './saved-sprees.service';
import { CurrentUser, AuthUser } from '../auth';
import { SpreePlan } from '../common/interfaces';

class SaveSpreeBody {
  name!: string;
  plan!: SpreePlan;
}

class UpdateSpreeBody {
  name?: string;
  plan?: SpreePlan;
}

@ApiTags('saved-sprees')
@ApiBearerAuth()
@Controller('api/saved-sprees')
export class SavedSpreesController {
  constructor(private readonly savedSpreesService: SavedSpreesService) {}

  @Get()
  @ApiOperation({ summary: 'List all saved sprees for the current user' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.savedSpreesService.findByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a saved spree by ID' })
  findById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.savedSpreesService.findById(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new spree plan' })
  create(@Body() body: SaveSpreeBody, @CurrentUser() user: AuthUser) {
    return this.savedSpreesService.create(user.id, body.name, body.plan);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a saved spree' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateSpreeBody,
    @CurrentUser() user: AuthUser,
  ) {
    return this.savedSpreesService.update(id, user.id, body.name, body.plan);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved spree' })
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    this.savedSpreesService.delete(id, user.id);
    return { deleted: true };
  }
}
