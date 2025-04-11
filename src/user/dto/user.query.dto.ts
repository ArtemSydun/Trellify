import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { CommonQueryParams } from 'src/common/dto/common.query.dto';
import { Languages } from 'src/common/enums/languages.enum';
import { SubscriptionPlans } from 'src/subscription/enum/subscription-plan.enum';
import { UserRoles } from 'src/user/enums/role.enum';

export enum UserOrderBy {
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
  Timezone = 'timezone',
}

export class UserQueryDto extends CommonQueryParams {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ enum: UserRoles })
  @IsOptional()
  @IsString()
  role?: UserRoles;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: UserOrderBy,
  })
  @IsOptional()
  @IsEnum(UserOrderBy)
  orderBy?: UserOrderBy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trelloUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trelloUserName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  telegramChatId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegramUserName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: Languages;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subscriptionPlan?: SubscriptionPlans;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  subscriptionExpired?: boolean;
}
