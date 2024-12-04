import { actionsEnabledByDefault } from "../constants/trello";
import { NotificationType, TrelloWebhookDetailedActions } from "../enums/trello.actions";
import { toCamelCase } from "./camelCase";

export const initializeNotificationArrays = (trelloUserId: string): NotificationType => {
    return Object.entries(TrelloWebhookDetailedActions).reduce((acc, [key, value]) => {
        const camelCaseKey = toCamelCase(key); // Convert to camelCase

        // Check if the action value is in the actionsEnabledByDefault array
        if (actionsEnabledByDefault.includes(value)) {
            // If the action is enabled by default, assign the user ID
            acc[camelCaseKey] = [trelloUserId];
        } else {
            // Otherwise, assign an empty array
            acc[camelCaseKey] = [];
        }

        return acc;
    }, {} as NotificationType);
};

export const initializeUserNotificationState = (enabledActions: TrelloWebhookDetailedActions[]): { [key: string]: boolean } => {
    return Object.keys(TrelloWebhookDetailedActions).reduce((acc, key) => {
      const camelCaseKey = toCamelCase(key);
      // Check if the action is in the enabled actions list
      if (enabledActions.includes(TrelloWebhookDetailedActions[key as keyof typeof TrelloWebhookDetailedActions])) {
        acc[camelCaseKey] = true; // Set the value to true for actions enabled by default
      }
      return acc;
    }, {} as { [key: string]: boolean });
  };

export const updateWebhookNotifications = (
    trelloUserId: string,
    webhookNotifications: NotificationType,
    userNotificationsUpdate: { [key: string]: boolean }
): NotificationType => {
    // Iterate over each notification type in the userNotificationsUpdate object
    Object.keys(userNotificationsUpdate).forEach(notificationType => {
        const shouldAddUser = userNotificationsUpdate[notificationType];

        // Check if the notification type exists in the webhookNotifications
        if (!webhookNotifications[notificationType]) {
            webhookNotifications[notificationType] = []; // Initialize if it doesn't exist
        }

        // If user should be added to the notification
        if (shouldAddUser) {
            if (!webhookNotifications[notificationType].includes(trelloUserId)) {
                webhookNotifications[notificationType].push(trelloUserId);
            }
        } else {
            // If user should be removed from the notification
            webhookNotifications[notificationType] = webhookNotifications[notificationType].filter(
                userId => userId !== trelloUserId
            );
        }
    });

    return webhookNotifications;
};
