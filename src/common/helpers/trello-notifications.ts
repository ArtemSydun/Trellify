import { I18nService } from 'nestjs-i18n';
import {
  NotificationBooleansDto,
  NotificationCategoriesDto,
} from 'src/trello/dto/notifications.dto';
import { Webhook } from 'src/trello/entities/webhook.entity';
import { User } from 'src/user/entities/user.entity';
import { UserRoles } from 'src/user/enums/role.enum';
import {
  TrelloWebhookDetailedActions,
  TrelloWebhookNotificationCategories,
} from '../../trello/enums/trello.actions.enum';
import {
  advancedProfileActions,
  basicProfileActions,
  categoryKeysMap,
  fullProfileActions,
} from '../constants/trello';
import { I18nKeys } from '../enums/i18n-keys.enum';
import { toCamelCase } from './camelCase';

const getKeysFromProfileActions = <T extends string>(
  actions: T[],
  enumObj: Record<string, T>,
): string[] => {
  const reverseEnumMap = Object.entries(enumObj).reduce(
    (acc, [key, value]) => {
      acc[value] = key;
      return acc;
    },
    {} as Record<string, string>,
  );

  return actions.map((action) => reverseEnumMap[action]);
};

export const getCategoriesForAction = (actionKey: string): string[] => {
  // Iterate over categoryKeysMap to find which categories contain the actionKey
  const matchingCategories = Object.keys(categoryKeysMap).filter((category) => {
    const transformedKeys = categoryKeysMap[category].map((key) =>
      toCamelCase(key, '_'),
    );
    return transformedKeys.includes(actionKey);
  });

  return matchingCategories;
};

//to ensure that personal category will be processed first
export const sortCategories = (categoriesToSort: string[]): string[] => {
  return [...categoriesToSort].sort((a, b) => {
    if (a === TrelloWebhookNotificationCategories.PERSONAL) return -1;
    if (b === TrelloWebhookNotificationCategories.PERSONAL) return 1;
    return 0;
  });
};

export const defaultActionsKeys = getKeysFromProfileActions(
  basicProfileActions,
  TrelloWebhookDetailedActions,
);

// Initialize notification arrays for a specific category
export const initializeCategoryNotifications = (
  trelloUserId: string,
  actions: Record<string, string>,
  enabledActions: string[],
): Record<string, string[]> => {
  return Object.entries(actions).reduce(
    (acc, [key, value]) => {
      const camelCaseKey = toCamelCase(key, '_');
      acc[camelCaseKey] = enabledActions.includes(value) ? [trelloUserId] : [];
      return acc;
    },
    {} as Record<string, string[]>,
  );
};

// Initialize notifications for all categories
export const initializeNotificationArrays = (
  trelloUserId: string,
  profileKeys?: string[],
): NotificationCategoriesDto => {
  return Object.keys(categoryKeysMap).reduce((acc, category) => {
    acc[category] = initializeCategoryNotifications(
      trelloUserId,
      categoryKeysMap[category].reduce(
        (actions, actionKey) => {
          actions[actionKey] = actionKey;
          return actions;
        },
        {} as Record<string, string>,
      ),
      profileKeys || defaultActionsKeys,
    );
    return acc;
  }, {} as NotificationCategoriesDto);
};

// Update webhook notifications for a specific category
// Convert category-specific notifications to boolean updates
export const mapNotificationsToBoolean = (
  notifications: NotificationCategoriesDto,
): NotificationBooleansDto => {
  return Object.keys(notifications).reduce((acc, category) => {
    acc[category] = Object.keys(notifications[category]).reduce(
      (subAcc, actionKey) => {
        subAcc[actionKey] = notifications[category][actionKey].length > 0; // Convert array presence to boolean
        return subAcc;
      },
      {} as Record<string, boolean>,
    );
    return acc;
  }, {} as NotificationBooleansDto);
};

// Update webhook notifications for a specific category
export const updateCategoryNotifications = (
  trelloUserId: string,
  currentNotifications: Record<string, string[]>,
  userUpdates: Record<string, boolean>,
  categoryActions: string[],
): Record<string, string[]> => {
  const updatedNotifications = { ...currentNotifications };
  // Iterate over the category-specific actions
  categoryActions.forEach((actionKey) => {
    const camelCaseKey = toCamelCase(actionKey, '_');
    const shouldAddUser = userUpdates[camelCaseKey];

    if (shouldAddUser !== undefined) {
      // Initialize the array if not exists
      if (!updatedNotifications[camelCaseKey]) {
        updatedNotifications[camelCaseKey] = [];
      }

      if (shouldAddUser) {
        // Add the user if not already present
        if (!updatedNotifications[camelCaseKey].includes(trelloUserId)) {
          updatedNotifications[camelCaseKey].push(trelloUserId);
        }
      } else {
        // Remove the user if present
        updatedNotifications[camelCaseKey] = updatedNotifications[
          camelCaseKey
        ].filter((userId) => userId !== trelloUserId);
      }
    }
  });

  return updatedNotifications;
};

// Update webhook notifications across all categories
export const getUpdatedWebhookNotifications = (
  trelloUserId: string,
  webhookNotifications: NotificationCategoriesDto,
  userNotificationsUpdate: NotificationBooleansDto,
): NotificationCategoriesDto => {
  return Object.keys(userNotificationsUpdate).reduce((acc, key) => {
    const categoryActions = categoryKeysMap[key] || [];

    acc[key] = updateCategoryNotifications(
      trelloUserId,
      webhookNotifications[key] || {},
      userNotificationsUpdate[key] || {},
      categoryActions,
    );
    return acc;
  }, {} as NotificationCategoriesDto);
};

//create boolean array with all values false (same as user will unsubscribe from all actions)
export const setAllKeysToFalse = (
  notifications: NotificationCategoriesDto,
): NotificationBooleansDto => {
  return Object.keys(notifications).reduce((acc, category) => {
    acc[category] = Object.keys(notifications[category]).reduce(
      (subAcc, actionKey) => {
        subAcc[actionKey] = false; // Set each action to false
        return subAcc;
      },
      {} as Record<string, boolean>,
    );
    return acc;
  }, {} as NotificationBooleansDto);
};

export function filterUserFromWebhook(webhook: Webhook, trelloUserId: string) {
  const updatedWebhookSubscribers = webhook.subscribers
    ? webhook.subscribers.filter(
        (subscriber) => subscriber.trelloUserId !== trelloUserId,
      )
    : [];
  const userNotificationsDisconnectArray = setAllKeysToFalse(
    webhook.notifications,
  );

  const updatedWebhookNotifications = getUpdatedWebhookNotifications(
    trelloUserId,
    webhook.notifications,
    userNotificationsDisconnectArray,
  );

  return { updatedWebhookSubscribers, updatedWebhookNotifications };
}

export function createFilteredWebhookCopy(webhook: Webhook): Webhook {
  const filteredWebhookProperties = filterUserFromWebhook(
    webhook,
    webhook.author.trelloUserId,
  );

  const webhookCopy = {
    ...webhook,
    subscribers: filteredWebhookProperties.updatedWebhookSubscribers,
    notifications: filteredWebhookProperties.updatedWebhookNotifications,
  };

  return webhookCopy;
}

export const generateProfilesNotificationBooleans = () => {
  // Step 1: Get profile action keys
  const basicProfile = getKeysFromProfileActions(
    basicProfileActions,
    TrelloWebhookDetailedActions,
  );

  const advancedProfile = getKeysFromProfileActions(
    advancedProfileActions,
    TrelloWebhookDetailedActions,
  );

  const fullProfile = getKeysFromProfileActions(
    fullProfileActions,
    TrelloWebhookDetailedActions,
  );

  // Step 2: Initialize notification categories for these profiles
  const profiles = {
    basic: mapNotificationsToBoolean(
      initializeNotificationArrays('userId', basicProfile),
    ),
    advanced: mapNotificationsToBoolean(
      initializeNotificationArrays('userId', advancedProfile),
    ),
    full: mapNotificationsToBoolean(
      initializeNotificationArrays('userId', fullProfile),
    ),
  };

  return profiles;
};

export const notificationProfiles = generateProfilesNotificationBooleans();

export const notificationMessageGenerator = (
  userToNotify: User,
  actionData: {
    boardName: string;
    boardUrl: string;
    actionDate: string;
    translatedMessage: string;
    actionAuthor?: string;
    actionAuthorUrl?: string;
    cardName?: string;
    cardUrl?: string;
    actionTarget?: string;
    actionTargetUrl?: string;
  },
  i18n: I18nService,
): string => {
  const {
    boardName,
    boardUrl,
    actionDate,
    translatedMessage,
    actionTarget,
    actionTargetUrl,
    actionAuthor,
    actionAuthorUrl,
    cardName,
    cardUrl,
  } = actionData;
  const { language: lang, role } = userToNotify;
  let formattedMessage = translatedMessage + '\n\n';

  console.log(actionTarget);

  if (cardName) {
    formattedMessage += `📋 **${i18n.t(I18nKeys.FIELDS_CARD, { lang })}: [${cardName}](${cardUrl})\n`;
  }

  if (boardName) {
    formattedMessage += `📌 **${i18n.t(I18nKeys.FIELDS_BOARD, { lang })}: [${boardName}](${boardUrl})\n`;
  }

  if (actionAuthor && role !== UserRoles.user) {
    formattedMessage += `👤 **${i18n.t(I18nKeys.FIELDS_AUTHOR, { lang })}: [${actionAuthor}](${actionAuthorUrl})\n`;
  }

  if (actionTarget && role !== UserRoles.user) {
    formattedMessage += `👤 **${i18n.t(I18nKeys.FIELDS_TARGET, { lang })}: [${actionTarget}](${actionTargetUrl})\n`;
  }

  if (actionDate) {
    formattedMessage += `📆 **${i18n.t(I18nKeys.FIELDS_DATE, { lang })}: ${actionDate} \n`;
  }

  return formattedMessage;
};
