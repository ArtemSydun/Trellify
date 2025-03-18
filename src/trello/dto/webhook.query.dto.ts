import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { CommonQueryParams } from 'src/common/dto/common.query.dto';

// Sorting options
export enum WebhookOrderBy {
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
  BoardName = 'boardName',
}

export class WebhookQueryDto extends CommonQueryParams {
  @ApiPropertyOptional({ description: 'Filter by Trello model ID' })
  @IsOptional()
  @IsString()
  idModel?: string;

  @ApiPropertyOptional({ description: 'Filter by board name (partial match)' })
  @IsOptional()
  @IsString()
  boardName?: string;

  @ApiPropertyOptional({ description: 'Filter by Trello user ID (author)' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ description: 'Filter by Trello username' })
  @IsOptional()
  @IsString()
  trelloUserName?: string;

  @ApiPropertyOptional({ description: 'Filter by webhook subscriber ID' })
  @IsOptional()
  @IsString()
  subscriberId?: string;

  @ApiPropertyOptional({ description: 'Sort order (asc or desc)' })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: WebhookOrderBy,
  })
  @IsOptional()
  @IsEnum(WebhookOrderBy)
  orderBy?: WebhookOrderBy;

  @ApiPropertyOptional({ description: 'Filter by createdAt date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional({ description: 'Filter by updatedAt date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  updatedAt?: string;

  @ApiPropertyOptional({ description: 'Filter by start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  toDate?: string;
}
