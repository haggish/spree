import { IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LatLngDto {
  @ApiProperty({ example: 52.52 })
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 13.405 })
  @IsNumber()
  lng!: number;
}

export class SpreeSelectionDto {
  @ApiProperty({ example: 'evt-001' })
  @IsString()
  eventId!: string;

  @ApiProperty({ example: 10, description: 'Minutes to stay at this event' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  stayMinutes: number = 10;
}

export class ComputeSpreeDto {
  @ApiProperty({ type: LatLngDto })
  @ValidateNested()
  @Type(() => LatLngDto)
  homeLocation!: LatLngDto;

  @ApiProperty({ example: '2026-04-05T10:00:00Z' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: '2026-04-05T18:00:00Z' })
  @IsDateString()
  endTime!: string;

  @ApiProperty({ type: [SpreeSelectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpreeSelectionDto)
  selections!: SpreeSelectionDto[];

  @ApiProperty({ example: 'DRIVE', required: false })
  @IsString()
  @IsOptional()
  travelMode: string = 'DRIVE';

  @ApiProperty({
    example: 'greedy',
    required: false,
    description: 'Optimization strategy: "greedy" (nearest-time) or "time-sort" (by start time)',
  })
  @IsString()
  @IsOptional()
  strategy: string = 'greedy';
}
