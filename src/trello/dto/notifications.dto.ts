import { ApiProperty } from '@nestjs/swagger';
import { initializeNotificationArrays, mapNotificationsToBoolean } from 'src/common/helpers/trello-notifications';

export class NotificationCategoriesDto {
  @ApiProperty({
    description: 'Notifications related to personal actions (related to certain user)',
    type: Object,
    example: initializeNotificationArrays('userId1').personal
  })
  personal: Record<string, string[]>;

  @ApiProperty({
    description: 'Notifications related to board events with user IDs.',
    type: Object,
    example: initializeNotificationArrays('userId1').board
  })
  board: Record<string, string[]>;

  @ApiProperty({
    description: 'Notifications related to card events with user IDs.',
    type: Object,
    example: initializeNotificationArrays('userId1').card
  })
  card: Record<string, string[]>;

  @ApiProperty({
    description: 'Notifications related to admin events with user IDs.',
    type: Object,
    example: initializeNotificationArrays('userId1').admin
  })
  admin: Record<string, string[]>;
}

export class NotificationBooleansDto {
  @ApiProperty({
    description: 'Notifications related to personal actions (related to certain user)',
    type: Object,
    example: mapNotificationsToBoolean(initializeNotificationArrays('userId')).personal
  })
  personal: Record<string, boolean>;

  @ApiProperty({
    description: 'Notifications related to board events with user IDs.',
    type: Object,
    example: mapNotificationsToBoolean(initializeNotificationArrays('userId')).board
  })
  board: Record<string, boolean>;

  @ApiProperty({
    description: 'Notifications related to card events with user IDs.',
    type: Object,
    example: mapNotificationsToBoolean(initializeNotificationArrays('userId')).card
  })
  card: Record<string, boolean>;

  @ApiProperty({
    description: 'Notifications related to admin events with user IDs.',
    type: Object,
    example: mapNotificationsToBoolean(initializeNotificationArrays('userId')).admin
  })
  admin: Record<string, boolean>;
}

