import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmptyObject,
  ValidateNested,
} from 'class-validator';
import {
  initializeNotificationArrays,
  mapNotificationsToBoolean,
} from 'src/common/helpers/trello-notifications';
import { TrelloWebhookNotificationProfiles } from '../enums/trello.actions.enum';

export class NotificationCategoriesDto {
  // @ApiProperty({
  //   description:
  //     'Notifications related to personal actions (related to certain user)',
  //   type: Object,
  //   example: initializeNotificationArrays('userId1').personal,
  // })
  // personal: Record<string, string[]>;

  @ApiProperty({
    description: 'Notifications related to card events with user IDs.',
    type: Object,
    example: initializeNotificationArrays('userId1').card,
  })
  card: Record<string, string[]>;

  @ApiProperty({
    description: 'Notifications related to checklist events with user IDs.',
    type: Object,
    example: initializeNotificationArrays('userId1').checklist,
  })
  checklist: Record<string, string[]>;

  @ApiProperty({
    description: 'Notifications related to board events with user IDs.',
    type: Object,
    example: initializeNotificationArrays('userId1').board,
  })
  board: Record<string, string[]>;

  @ApiProperty({
    description: 'Notifications related to list events with user IDs.',
    type: Object,
    example: initializeNotificationArrays('userId1').list,
  })
  list: Record<string, string[]>;
}

export class NotificationBooleansDto {
  // @ApiProperty({
  //   description:
  //     'Notifications related to personal actions (related to certain user)',
  //   type: Object,
  //   example: mapNotificationsToBoolean(initializeNotificationArrays('userId'))
  //     .personal,
  // })
  // @IsNotEmptyObject()
  // personal: Record<string, boolean>;

  @ApiProperty({
    description: 'Notifications related to card events with user IDs.',
    type: Object,
    example: mapNotificationsToBoolean(initializeNotificationArrays('userId'))
      .card,
  })
  @IsNotEmptyObject()
  card: Record<string, boolean>;

  @ApiProperty({
    description: 'Notifications related to checklist events with user IDs.',
    type: Object,
    example: mapNotificationsToBoolean(initializeNotificationArrays('userId'))
      .checklist,
  })
  @IsNotEmptyObject()
  checklist: Record<string, boolean>;

  @ApiProperty({
    description: 'Notifications related to board events with user IDs.',
    type: Object,
    example: mapNotificationsToBoolean(initializeNotificationArrays('userId'))
      .board,
  })
  @IsNotEmptyObject()
  board: Record<string, boolean>;

  @ApiProperty({
    description: 'Notifications related to list events with user IDs.',
    type: Object,
    example: mapNotificationsToBoolean(initializeNotificationArrays('userId'))
      .list,
  })
  @IsNotEmptyObject()
  list: Record<string, boolean>;
}

export class UpdateNotificationsDto {
  @ApiProperty({
    description: 'Notifications choosen by user',
    type: NotificationBooleansDto,
  })
  @ValidateNested()
  @Type(() => NotificationBooleansDto)
  notifications: NotificationBooleansDto;

  @ApiProperty({
    description: 'Notification profile choosen by user',
    type: Object,
    example: TrelloWebhookNotificationProfiles.BASIC,
    enum: TrelloWebhookNotificationProfiles,
  })
  @IsEnum(TrelloWebhookNotificationProfiles, {
    message: 'notificationProfile must be a valid profile value',
  })
  notificationProfile: TrelloWebhookNotificationProfiles;
}

export class UpdateManyNotificationsDto extends UpdateNotificationsDto {
  @ApiProperty({
    description: 'Webhooks to update',
    type: NotificationBooleansDto,
  })
  @IsArray()
  webhooks: string[];
}
