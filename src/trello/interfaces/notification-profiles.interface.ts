import { NotificationBooleansDto } from '../dto/notifications.dto';

export interface NotificationProfiles {
  basic: {
    price: number;
    notifications: NotificationBooleansDto;
  };
  advanced: {
    price: number;
    notifications: NotificationBooleansDto;
  };
  full: {
    price: number;
    notifications: NotificationBooleansDto;
  };
}
