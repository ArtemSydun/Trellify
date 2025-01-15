import { NotificationBooleansDto } from '../dto/notifications.dto';

export interface NotificationProfiles {
  basic: NotificationBooleansDto;
  advanced: NotificationBooleansDto;
  full: NotificationBooleansDto;
}
