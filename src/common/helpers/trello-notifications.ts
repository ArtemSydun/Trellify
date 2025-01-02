import { actionsEnabledByDefault, categoryKeysMap } from "../constants/trello";
import {
    TrelloWebhookDetailedActions,
} from "../../trello/enums/trello.actions.enum";
import { toCamelCase } from "./camelCase";
import { NotificationBooleansDto, NotificationCategoriesDto } from "src/trello/dto/notifications.dto";

const getKeysFromDefaultActions = <T extends string>(
    actions: T[],
    enumObj: Record<string, T>,
): string[] => {
    const reverseEnumMap = Object.entries(enumObj).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
    }, {} as Record<string, string>);

    return actions.map(action => reverseEnumMap[action]);
};

export const getCategoryForAction = (actionKey: string): string | null => {
    // Iterate over categoryKeysMap to find which category contains the transformed actionKey
    const category = Object.keys(categoryKeysMap).find(category => {
        const transformedKeys = categoryKeysMap[category].map(key => toCamelCase(key, '_'));
        console.log(`Transformed keys for category ${category}:`, transformedKeys);
        return transformedKeys.includes(actionKey);
    });

    return category || null;
};

export const defaultActionsKeys = getKeysFromDefaultActions(
    actionsEnabledByDefault,
    TrelloWebhookDetailedActions
);

// Initialize notification arrays for a specific category
export const initializeCategoryNotifications = (
    trelloUserId: string,
    actions: Record<string, string>,
    enabledActions: string[]
): Record<string, string[]> => {
    return Object.entries(actions).reduce((acc, [key, value]) => {
        const camelCaseKey = toCamelCase(key, '_');
        acc[camelCaseKey] = enabledActions.includes(value) ? [trelloUserId] : [];
        return acc;
    }, {} as Record<string, string[]>);
};

// Initialize notifications for all categories
export const initializeNotificationArrays = (trelloUserId: string): NotificationCategoriesDto => {
    return Object.keys(categoryKeysMap).reduce((acc, category) => {
        acc[category] = initializeCategoryNotifications(
            trelloUserId,
            categoryKeysMap[category].reduce((actions, actionKey) => {
                actions[actionKey] = actionKey;
                return actions;
            }, {} as Record<string, string>),
            defaultActionsKeys
        );
        return acc;
    }, {} as NotificationCategoriesDto);
};

// Update webhook notifications for a specific category
// Convert category-specific notifications to boolean updates
export const mapNotificationsToBoolean = (
    notifications: NotificationCategoriesDto
): NotificationBooleansDto => {
    return Object.keys(notifications).reduce((acc, category) => {
        acc[category] = Object.keys(notifications[category]).reduce((subAcc, actionKey) => {
            subAcc[actionKey] = notifications[category][actionKey].length > 0; // Convert array presence to boolean
            return subAcc;
        }, {} as Record<string, boolean>);
        return acc;
    }, {} as NotificationBooleansDto);
};

// Update webhook notifications for a specific category
export const updateCategoryNotifications = (
    trelloUserId: string,
    currentNotifications: Record<string, string[]>,
    userUpdates: Record<string, boolean>,
    categoryActions: string[]
): Record<string, string[]> => {
    const updatedNotifications = { ...currentNotifications };
    // Iterate over the category-specific actions
    categoryActions.forEach(actionKey => {
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
                updatedNotifications[camelCaseKey] = updatedNotifications[camelCaseKey].filter(
                    userId => userId !== trelloUserId
                );
            }
        }
    });

    return updatedNotifications;
};

// Update webhook notifications across all categories
export const getUpdatedWebhookNotifications = (
    trelloUserId: string,
    webhookNotifications: NotificationCategoriesDto,
    userNotificationsUpdate: NotificationBooleansDto
): NotificationCategoriesDto => {

    return Object.keys(userNotificationsUpdate).reduce((acc, key) => {
        const categoryActions = categoryKeysMap[key] || [];

        acc[key] = updateCategoryNotifications(
            trelloUserId,
            webhookNotifications[key] || {},
            userNotificationsUpdate[key] || {},
            categoryActions
        );
        return acc;
    }, {} as NotificationCategoriesDto);
};

//create boolean array with all values false (same as user will unsubscribe from all actions)
export const setAllKeysToFalse = (notifications: NotificationCategoriesDto): NotificationBooleansDto => {
    return Object.keys(notifications).reduce((acc, category) => {
        acc[category] = Object.keys(notifications[category]).reduce((subAcc, actionKey) => {
            subAcc[actionKey] = false; // Set each action to false
            return subAcc;
        }, {} as Record<string, boolean>);
        return acc;
    }, {} as NotificationBooleansDto);
};
