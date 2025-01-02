import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class Notifications {
  // Uncomment this section if 'CARD_CREATED' is enabled in your actionsEnabledByDefault
  // @ApiProperty({
  //   description: 'Notification for when a card is created.',
  //   example: true,
  //   required: false,
  // })
  // @IsBoolean()
  // @IsOptional()
  // cardCreated?: boolean;

  @ApiProperty({
    description: 'Notification for when a card is renamed.',
    example: true, 
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardRenamed?: boolean;

  @ApiProperty({
    description: 'Notification for when a card is archived.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardArchived?: boolean;

  @ApiProperty({
    description: 'Notification for when a card is deleted.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardDeleted?: boolean;

  @ApiProperty({
    description: 'Notification for when a member is added to a card.',
    example: true, 
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardMemberAdded?: boolean;

  @ApiProperty({
    description: 'Notification for when a member is removed from a card.',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardMemberRemoved?: boolean;

  @ApiProperty({
    description: 'Notification for when a comment is added to a card.',
    example: true, 
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardCommentAdded?: boolean;

  @ApiProperty({
    description: 'Notification for when an attachment is added to a card.',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardAttachmentAdded?: boolean;

  @ApiProperty({
    description: 'Notification for when a due date is added to a card.',
    example: true, 
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardDueDateAdded?: boolean;

  @ApiProperty({
    description: 'Notification for when a due date is changed on a card.',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardDueDateChanged?: boolean;

  @ApiProperty({
    description: 'Notification for when a start date is added to a card.',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardStartDateAdded?: boolean;

  @ApiProperty({
    description: 'Notification for when a start date is changed on a card.',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardStartDateChanged?: boolean;

  @ApiProperty({
    description: 'Notification for when a card is moved to a different list.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardMovedToList?: boolean;

  @ApiProperty({
    description: 'Notification for when a label is added to a card.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardLabelAdded?: boolean;

  @ApiProperty({
    description: 'Notification for when a label is removed from a card.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardLabelRemoved?: boolean;

  @ApiProperty({
    description: 'Notification for when a checklist is added to a card.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardChecklistAdded?: boolean;

  @ApiProperty({
    description: 'Notification for when a checklist is removed from a card.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  cardChecklistRemoved?: boolean;

  @ApiProperty({
    description: 'Notification for when a checklist item member is added.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  checklistItemMemberAdded?: boolean;

  @ApiProperty({
    description: 'Notification for when a checklist item member is removed.',
    example: false, 
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  checklistItemMemberRemoved?: boolean;

  @ApiProperty({
    description: 'Notification for when a checklist item state is changed to completed.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  checklistItemStateChangedCompleted?: boolean;

  @ApiProperty({
    description: 'Notification for when a checklist item state is changed to incomplete.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  checklistItemStateChangedIncompleted?: boolean;

  @ApiProperty({
    description: 'Notification for when a checklist item is converted to a card.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  checklistItemConvertedToCard?: boolean;

  @ApiProperty({
    description: 'Notification for when a list is created.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  listCreated?: boolean;

  @ApiProperty({
    description: 'Notification for when a list is moved left.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  listMovedLeft?: boolean;

  @ApiProperty({
    description: 'Notification for when a list is moved right.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  listMovedRight?: boolean;

  @ApiProperty({
    description: 'Notification for when a list is archived.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  listArchived?: boolean;

  @ApiProperty({
    description: 'Notification for when a list is renamed.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  listRenamed?: boolean;

  @ApiProperty({
    description: 'Notification for when a member is removed from the board.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  boardMemberRemoved?: boolean;

  @ApiProperty({
    description: 'Notification for when a board member invitation is joined.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  boardMemberInvitationJoined?: boolean;

  @ApiProperty({
    description: 'Notification for when a board member leaves.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  boardMemberLeft?: boolean;

  @ApiProperty({
    description: 'Notification for when a new board member joins.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  boardMemberJoined?: boolean;

  @ApiProperty({
    description: 'Notification for when a board admin is added.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  boardAdminAdded?: boolean;

  @ApiProperty({
    description: 'Notification for when a board member is given a normal role.',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  boardMemberNormalRoleAdded?: boolean;
}

export class NotificationCategoriesDto {
  @ApiProperty({
    description: 'Notifications related to board events with user IDs.',
    type: Object,
    example: {
      boardAdminAdded: ['userId1', 'userId2'],
      boardMemberInvitationJoined: ['userId3'],
    },
  })
  board: Record<string, string[]>;

  @ApiProperty({
    description: 'Notifications related to card events with user IDs.',
    type: Object,
    example: {
      cardArchived: ['userId6', 'userId7'],
      cardAttachmentAdded: ['userId8'],
    },
  })
  card: Record<string, string[]>;

  @ApiProperty({
    description: 'Notifications related to admin events with user IDs.',
    type: Object,
    example: {
      adminPermissionGranted: ['userId9'],
    },
  })
  admin: Record<string, string[]>;
}

export class NotificationBooleansDto {
  @ApiProperty({
    description: 'Notifications related to board events with user IDs.',
    type: Object,
    example: {
      boardAdminAdded: false,
      boardMemberInvitationJoined: true,
    },
  })
  board: Record<string, boolean>;

  @ApiProperty({
    description: 'Notifications related to card events with user IDs.',
    type: Object,
    example: {
      cardArchived: false,
      cardAttachmentAdded: true,
    },
  })
  card: Record<string, boolean>;

  @ApiProperty({
    description: 'Notifications related to admin events with user IDs.',
    type: Object,
    example: {
      adminPermissionGranted: true,
    },
  })
  admin: Record<string, boolean>;
}

